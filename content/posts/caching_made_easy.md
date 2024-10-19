---
title: "Caching made easy"
date: 2024-10-18T23:19:20+02:00
draft: false
featuredImage: "/images/blog/caching_made_easy.webp"
featuredImagePreview: "/images/blog/caching_made_easy.webp"
---

In modern app development, apps are increasingly expected to be offline-first, 
meaning they should be able to handle operations with limited or no network connectivity. 
As a result, caching has become a first-class citizen in app architectures, 
providing multiple benefits: 
- fewer network calls
- reduced data usage
- improved performance, 
- and easier data management across app screens.

In this post, I’ll discuss a common naive approach, and introduce a more scalable, reusable, and testable caching strategy.

## The naive caching approach
You may wonder, “Is caching worth its own blog post?” After all, 
isn’t it just storing data locally in a variable or using something like `MutableStateFlow` in a repository?

While that’s true for simple cases, caching can become more complex. 
For example, serving from the cache and then refreshing data from a remote source 
while ensuring data consistency is not trivial.

Imagine a project with dozens of repositories, each managing its own caching logic.
If you implement this logic in a basic way for every repository, you'll end up writing redundant code and 
creating a lot of boilerplate, not to mention the burden of testing each implementation individually. 
Wouldn't it be better to extract all the caching logic into a reusable class and test it thoroughly once?

In smaller projects, caching is often implemented in a quick and dirty way. 
Here’s how it might look in a typical repository:
- Store data in a local variable (or something like `MutableStateFlow`).
- Fetch from the network when needed and update the cache.
- Serve cached data if it’s available, otherwise fetch from the remote source. 

This works for simple scenarios, but as the complexity grows, this approach becomes problematic. 
Each repository duplicates the caching logic and add their own touch to it, 
and this logic often ends up scattered throughout the codebase, 
making it harder to maintain and test.

## An opinionated caching approach
To address the aforementioned issues, we can introduce a reusable, opinionated caching mechanism that 
abstracts the common caching strategies into a separate class. This will allow us to define caching once
and reuse it across multiple repositories.

We start by creating an interface that encapsulates the most common caching strategies:

{{< highlight kotlin "linenos=table">}}
interface DataAccess<T> {

    // Serve from cache
    fun get(): T?

    // Serve from cache if present, otherwise fetch from remote
    suspend fun getOrFetch(): T

    // Clear cache, then fetch from remote
    suspend fun clearAndFetch(): T

    // Serve from cache, then fetch from remote
    fun getAndFetch(): Flow<T>

    // To allow further extension of the interface
    companion object

}
{{< / highlight >}}

The cache can be in-memory, disk, or a database. Below is an implementation of `DataAccess`:

{{< highlight kotlin "linenos=table">}}
internal class DataAccessImpl<Remote, Local>(
    val log: (String) -> Unit,
    val get: () -> Local?,
    val save: (Remote?) -> Unit,
    val fetch: suspend () -> Remote,
) : DataAccess<Local> {

    private val isFetching = AtomicBoolean(false)

    override fun get() = get.invoke()

    override suspend fun getOrFetch() = flow { emitIfNotNull() ?: fetchSaveEmit() }
        .flowLogging()
        .first()

    override suspend fun clearAndFetch() = flow { fetchSaveEmit() }
        .onStart { clear() }
        .flowLogging()
        .first()

    override fun getAndFetch() = flow { fetchSaveEmit() }
        .onStart { emitIfNotNull() }
        .flowLogging()

    private fun <Data> Flow<Data>.flowLogging() =
        onStart { log("Starting flow") }
            .onEach { log("Emitting value: $it") }
            .onCompletion { log("Ending flow") }

    private suspend fun FlowCollector<Local>.emitIfNotNull(): Local? {
        log("Checking local data")
        return get()
            ?.also { log("Found local data") }
            ?.also { emit(it) }
            .also { if (it == null) log("No local data found") }
    }

    private suspend fun fetchAndSave() {
        if (isFetching.compareAndSet(false, true)) {
            try {
                log("Fetching remote data")
                fetch()
                    .also { log("Saving remote value: $it") }
                    .also(save)
            } finally {
                isFetching.set(false)
            }
        } else {
            log("Skip fetching remote data as a call is already running")
            while (isFetching.get()) {
                delay(10) // wait to ensure further calls have the updated local state
            }
        }
    }

    private suspend fun FlowCollector<Local>.fetchSaveEmit() {
        fetchAndSave()
        emitIfNotNull()
    }

    private fun clear() {
        log("Clear local data")
        save(null)
    }

}
{{< / highlight >}}

This implementation uses `Kotlin`’s `Flow` to handle data streams. 
It ensures that the cache is updated when data is fetched from a remote source and also provides 
a naive concurrency handling to avoid multiple fetches happening simultaneously.

## Memory cache

Let’s add a factory method to instantiate an in-memory cache:

{{< highlight kotlin "linenos=table">}}
inline operator fun <reified Remote> DataAccess.Companion.invoke(
    noinline log: (String) -> Unit = {},
    noinline fetch: suspend () -> Remote,
): DataAccess<Remote> {
    var data: Remote? = null
    return DataAccess(
        get = { data },
        save = { data = it },
        fetch = fetch,
        log = log,
    )
}
{{< / highlight >}}

## Putting it all together

Now that we have our caching infrastructure, let’s implement a repository that uses this approach.
Suppose we have a Retrofit `BookService` that fetches book details. 
We can create a `BookRepository` that caches the book data in memory:

{{< highlight kotlin "linenos=table">}}
@Serializable
data class BookDto(
    val isbn: String,
    val title: String,
    val author: String,
)

@GET("/book/{isbn}")
suspend fun getBook(
    @Path("isbn") isbn: String,
): BookDto
{{< / highlight >}}

Here's a working implementation of `BookRepository`:

{{< highlight kotlin "linenos=table">}}
interface BookRepository {
    suspend fun getBookDataAccess(isbn: String): DataAccess<Result<Book>>
}

internal class BooksRepositoryImpl(
    private val service: BookService,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) : BookRepository {
    private var bookDataAccess: DataAccess<Result<Book>>? = null

    override suspend fun getBookDataAccess(isbn: String): DataAccess<Result<Book>> {
        return dispatcher {
            if (bookDataAccess == null) {
                bookDataAccess = DataAccess(
                    fetch = {
                        runCatching {
                            service.getBook(isbn).map(BookDto::toDomain)
                        }
                    },
                )
            }
            return@dispatcher bookDataAccess!!
        }
    }
}
{{< / highlight >}}

The `toDomain()` is an imaginary extension function that maps `BookDto` to `Book`.

Finally, here’s how you would use this in a `ViewModel`:

{{< highlight kotlin "linenos=table">}}
class BookViewModel(
    val repository: BookRepository,
) : ViewModel() {
    fun getBook(isbn: String) {
        viewModelScope.launch {
            repository.getBookDataAccess(isbn).getOrFetch()
        }
    }
}
{{< / highlight >}}

## Conclusion
By abstracting the caching logic into a reusable `DataAccess` class, we reduce boilerplate, improve maintainability, 
and simplify testing. This approach scales well as your project grows and can be easily extended to 
support different caching mechanisms through the same interface.
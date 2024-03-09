---
title: "A smarter way of testing Coroutines with runTest"
date: 2024-03-08T23:23:25+01:00
draft: false
featuredImage: "/images/blog/runtest_simplified.webp"
featuredImagePreview: "/images/blog/runtest_simplified.webp"
---

Testing coroutine-based code in Kotlin can be challenging due to its asynchronous nature. 
Fortunately, Kotlin's `kotlinx.coroutines` library provides helpful utilities for testing, including the `runTest` function. 
Let's dive into how to effectively use runTest and streamline coroutine testing in your Kotlin projects.

## `runTest`
You're probably used `runTest` before. Let me quote [kotlinlang.org](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-test/kotlinx.coroutines.test/run-test.html):

> Executes testBody as a test in a new coroutine, returning TestResult.</br>
> On JVM and Native, this function behaves similarly to runBlocking, with the difference that the code that it runs will skip delays.

{{< highlight kotlin "linenos=table">}}
@Test
fun exampleTest() = runTest {
    val deferred = async {
        delay(1.seconds)
        async {
            delay(1.seconds)
        }.await()
    }

    deferred.await() // result available immediately
}
{{< / highlight >}}

In order to use `runTest` effectively, one must inject the `CoroutineDispatcher` to their class.

## Injecting `CoroutineDispatcher`
Consider the following `BooksViewModel`, which fetches a list of books and updates the local UI state:

{{< highlight kotlin "linenos=table">}}
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.invoke
import kotlinx.coroutines.launch

class BooksViewModel(
    private val repository: BooksRepository,
    private val backgroundDispatcher: CoroutineDispatcher,
) : ViewModel() {

    private val _booksUiState = MutableStateFlow<BooksUiState>([default state])
    val booksUiState: StateFlow<BooksUiState> = _booksUiState

    init {
        viewModelScope.launch {
            _booksUiState.value = loadBooks()
        }
    }
    private suspend fun loadBooks(): BooksUiState = backgroundDispatcher {
        val books = repository.getBooks()
        books.toBooksUiState()
    }
    
    private fun List<Book>.toBooksUiState(): BooksUiState { ... }
}
{{< / highlight >}}

It employs two different `CoroutineDispatcher`s. This allows flexibility in testing by substituting a `TestDispatcher` during testing.

## Writing a Test
Let's write a test for `BooksViewModel` using `runTest`.

{{< highlight kotlin "linenos=table">}}
class BooksViewModelTest {

    private var dispatcher: TestDispatcher = UnconfinedTestDispatcher()
    private val repository = mockk<BooksRepository>()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun verifyBooksAreLoaded() = runTest(dispatcher) {
        coEvery { repository.getBooks() } returns listOf(Book("title"))
        val viewModel = BooksViewModel(
            repository = repository,
            backgroundDispatcher = dispatcher,
        )
        assert(viewModel.booksUiState.value.books == listOf(Book("title")))
    }
}
{{< / highlight >}}

A `TestDispatcher` is created and passed to both `runTest` on line 17 and `BooksViewModel` on line 21.
It's also set as the Main dispatcher on line 8. We need it because `viewModelScope` is defined as `CloseableCoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)`.

## Improve the setup
The test works, but it is too verbose. Let's improve it step by step. There's a nice hint in the `runTest`'s [documentations](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-test/kotlinx.coroutines.test/run-test.html):

> If `Dispatchers.Main` is set to a `TestDispatcher` via `Dispatchers.setMain` before the test, then its `TestCoroutineScheduler` is used; otherwise, a new one is automatically created.

We're using `Dispatchers.setMain(dispatcher)` which means `runTest` automatically adopts our beloved `dispatcher`.

{{< admonition type=tip title="Improvement 1" open=true >}}
Simplify `runTest(dispatcher)` to `runTest`
{{< /admonition >}}

We'll need the following boilerplate every time. Let's extract it to an [Extension](https://junit.org/junit5/docs/current/user-guide/#extensions) (JUnit 5) or a [Rule](https://developer.android.com/reference/android/arch/core/executor/testing/InstantTaskExecutorRule) (JUnit4).

{{< highlight kotlin "linenos=table">}}
private var dispatcher: TestDispatcher = UnconfinedTestDispatcher()

@BeforeEach
fun setUp() {
    Dispatchers.setMain(dispatcher)
}

@AfterEach
fun tearDown() {
    Dispatchers.resetMain()
}
{{< / highlight >}}

{{< admonition type=tip title="Improvement 2" open=true >}}
Extract the boilerplate around test dispatcher handling into a reusable component. 
{{< /admonition >}}

### JUnit5
{{< highlight kotlin "linenos=table">}}
class CoroutineTestExtension(
    val dispatcher: TestDispatcher = UnconfinedTestDispatcher(),
) : AfterEachCallback, BeforeEachCallback {

    override fun beforeEach(context: ExtensionContext?) {
        Dispatchers.setMain(dispatcher)
    }

    override fun afterEach(context: ExtensionContext?) {
        Dispatchers.resetMain()
    }
}
{{< / highlight >}}

### JUnit4
{{< highlight kotlin "linenos=table">}}
class CoroutineTestExtension(
    val dispatcher: TestDispatcher = UnconfinedTestDispatcher(),
) : InstantTaskExecutorRule() {

    override fun starting(description: Description) {
        super.starting(description)
        Dispatchers.setMain(dispatcher)
    }

    override fun finished(description: Description) {
        super.finished(description)
        Dispatchers.resetMain()
    }
}
{{< / highlight >}}

## The final version
Now, let's rewrite our initial test.

{{< highlight kotlin "linenos=table">}}
class BooksViewModelTest {

    @JvmField
    @RegisterExtension
    val testRule = CoroutineTestExtension()

    private val repository = mockk<BooksRepository>()

    @Test
    fun verifyBooksAreLoaded() = runTest {
        coEvery { repository.getBooks() } returns listOf(Book("title"))
        val viewModel = BooksViewModel(
            repository = repository,
            backgroundDispatcher = testRule.dispatcher,
        )
        assert(viewModel.booksUiState.value.books == listOf(Book("title")))
    }
}
{{< / highlight >}}

Quite neat, right? The test dispatcher can be accessed via `testRule.dispatcher`.
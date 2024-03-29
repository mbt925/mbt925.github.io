---
title: "A handy Kotlin coroutine extension for switching dispatcher"
date: 2024-03-02T23:23:25+01:00
draft: false
featuredImage: "/images/blog/handy_coroutine_dispatcher_extension.webp"
featuredImagePreview: "/images/blog/handy_coroutine_dispatcher_extension.webp"
toc:
   enable: false
---

Imagine you have a suspend function like this:

{{< highlight kotlin "linenos=table">}}
suspend fun doSomething() = withContext(Dispatchers.IO) {
   // body
}
{{< / highlight >}}

This looks alright. Using `withContext` every time looks a bit verbose though. There's a nifty Kotlin extension on the `invoke` function that simplifies the code and makes it cleaner.

{{< highlight kotlin "linenos=table">}}
import kotlinx.coroutines.invoke

suspend fun doSomething() = Dispatchers.IO {
   // body
}
{{< / highlight >}}

The `invoke` extension allows you to specify the dispatcher directly within the function call, eliminating the need for `withContext`.

---
title: "Boosting test reusability with test fixtures"
date: 2024-10-04T16:27:46+02:00
draft: false
featuredImage: "/images/blog/test_fixtures.webp"
featuredImagePreview: "/images/blog/test_fixtures.webp"
---

With this long-awaited [issue](https://issuetracker.google.com/issues/259523353) now resolved, the Android Gradle Plugin (AGP) properly supports `testFixtures` source sets.
This means you no longer need to create a separate module to expose test fixtures or include them in the main source set.

## Test fixtures

The `testFixtures` source set is particularly useful for improving test code reusability.
It provides developers with a structured way to create and share test-related code across multiple test suites (e.g., unit tests and instrumented tests) as well as across modules.
A `testFixtures` source set has access to the main source set and all internal module APIs.

## Module setup

To start, migrate your project to use `AGP 8.5.0` or above, and add the following line to your `gradle.properties` file:

{{< highlight kotlin "linenos=table">}}
android.experimental.enableTestFixturesKotlinSupport=true
{{< / highlight >}}

For each module with a `testFixtures` source set, enable it by adding the corresponding line to its `build.gradle.kts` file:

{{< highlight kotlin "linenos=table">}}
android {   
    testFixtures {
       enable = true
    }
}

dependencies {
    testFixturesCompileOnly "org.jetbrains.kotlin:kotlin-stdlib:<kotlin-version>"
}
{{< / highlight >}}

Note that the step for adding the `stdlib` dependency might become redundant [in the future](https://issuetracker.google.com/issues/340315591)!

## Define models

First, let's create module `A`:

{{< highlight kotlin "linenos=table">}}
plugins {
    id("com.android.application")
}

android {
    namespace = "com.mbt925.A"

    testFixtures {
        enable = true
    }
}

dependencies {
    testFixturesCompileOnly("org.jetbrains.kotlin:kotlin-stdlib:<kotlin-version>")
}
{{< / highlight >}}

Now let's define some domain models:

{{< highlight kotlin "linenos=table">}}
data class Foo(
    val bar: String,
    val baz: Int,
    val qux: Boolean,
)

data class Quux(
    val corge: String,
    val grault: Int,
)
{{< / highlight >}}

At this point, the module structure should look like this:

{{< image src="/images/blog/test_fixtures/domain.webp">}}

## Provide test fixtures and factories

Next, we’ll provide a factory for `Foo` and some fixtures for `Quux`:

{{< highlight kotlin "linenos=table">}}
val quux1 = Quux(corge = "garply", grault = 42)
val quux2 = Quux(corge = "waldo", grault = 13)

class FooFactory {

    fun get(
        bar: String = "foo",
        baz: Int = 42,
        qux: Boolean = true,
    ) = Foo(bar = bar, baz = baz, qux = qux)

}
{{< / highlight >}}

{{< image src="/images/blog/test_fixtures/fixtures.webp">}}

## Consume test fixtures

For a module to consume these test fixtures, add the following line to its `build.gradle.kts` file:

{{< highlight kotlin "linenos=table">}}
dependencies {
    testImplementation(testFixtures(project(":A")))
}
{{< / highlight >}}

You can now use the test fixtures and factories in your tests:

{{< highlight kotlin "linenos=table">}}
class Test {

    @Test
    fun test1() {
        // GIVEN
        val bar1 = FooFactory().get()
        // THEN
        ...
    }

}
{{< / highlight >}}

## Conclusion

The `testFixtures` source set offers numerous benefits. Here are a few key advantages:

##### Test code reusability
`testFixtures` allows you to write reusable test code that can be shared between different test source sets and across modules, reducing redundancy.
##### Better test organization
With a dedicated `testFixtures` source set, you can separate your production code, test code, and test-related utilities. This improves code organization by clearly defining where helper classes and functions for testing are located.
##### Isolation of test dependencies
`testFixtures` can depend on test-specific dependencies (e.g., mocking frameworks, testing libraries) without polluting your main source set.
##### Simplified testing in multi-module projects
In multi-module projects, the `testFixtures` source set makes it easier to share test utilities between different modules without duplicating code.
##### Native Gradle Support
Since `testFixtures` are officially supported by `AGP 8.5.0` and above, there's native integration with the Gradle build system, making it easy to configure, manage, and maintain in comparison to custom solutions.
##### Separate Classpath
The `testFixtures` source set has its own classpath, which ensures that test-related code does not end up in your production builds.
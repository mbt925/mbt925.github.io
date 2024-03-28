---
title: "Typealias vs. inline value class"
date: 2024-03-26T20:28:25+01:00
draft: false
featuredImage: "/images/blog/typealias_vs_value_class.webp"
featuredImagePreview: "/images/blog/typealias_vs_value_class.webp"
---

Normally, `Typealias` and `inline value class` (which I'll refer to as `value class` throughout this text) are utilized for different purposes. However, developers might occasionally use one for the other.
Let’s explore some examples and clarify the differences.

## `Typealias`
[kotlinlang.org](https://kotlinlang.org/docs/type-aliases.html) does a pretty good job explaining `Typealias`:

> Type aliases provide alternative names for existing types. If the type name is too long you can introduce a different shorter name and use the new one instead.

For instance, it's often tempting to shrink collection types:

{{< highlight kotlin "linenos=table">}}
typealias Node2DArray = List<List<Node>>

typealias FileTable<K> = MutableMap<K, MutableList<File>>
{{< / highlight >}}

You can have new names for inner and nested classes:

{{< highlight kotlin "linenos=table">}}
class A {
    inner class Inner
}
typealias AInner = A.Inner
{{< / highlight >}}

## `Inline value class`
Let's see how [kotlinlang.org](https://kotlinlang.org/docs/inline-classes.html) defines a `value class`:

> Sometimes it is useful to wrap a value in a class to create a more domain-specific type. Kotlin introduces a special kind of class called an inline class. Inline classes are a subset of value-based classes. They don't have an identity and can only hold values.

To declare a `value class`, use the `value` modifier before the name of the class:

{{< highlight kotlin "linenos=table">}}
// For JVM backends
@JvmInline
value class Password(private val s: String)
{{< / highlight >}}

A `value class` must have a single property initialized in the primary constructor. At runtime, instances of the `value class` will be represented using this single property:

{{< highlight kotlin "linenos=table">}}
// No actual instantiation of class 'Password' happens
// At runtime 'securePassword' contains just 'String'
val securePassword = Password("Don't try this in production")
{{< / highlight >}}

## Use cases
Let's consider the following simple data model `Person`:

{{< highlight kotlin "linenos=table">}}
data class Person(
    val name: String,
    val family: String,
    val age: Int,
    val height: Int,
)
{{< / highlight >}}

If you’re wondering how to ensure that the correct arguments are passed for similarly typed parameters like `name` and `family`, or `age` and `height`, Kotlin's answer is the `value class`:

{{< highlight kotlin "linenos=table">}}
@JvmInline
value class Name(val value: String)

@JvmInline
value class Family(val value: String)

@JvmInline
value class Age(val value: Int)

@JvmInline
value class Height(val value: Int)

data class Person(
    val name: Name,
    val family: Family,
    val age: Age,
    val height: Height,
)
{{< / highlight >}}

Therefore, the caller needs to use the correct argument type for each corresponding parameter, as follows:

{{< highlight kotlin "linenos=table">}}
Person(Name("John"), Family("Doe"), Age(27), Height(180))
{{< / highlight >}}

Using `typealias` in this scenario is not a solution to the aforementioned problem:

{{< highlight kotlin "linenos=table">}}
typealias Name = String
typealias Family = String
typealias Age = Int
typealias Height = Int

data class Person(
    val name: Name,
    val family: Family,
    val age: Age,
    val height: Height,
)
{{< / highlight >}}

Because no rule is enforced at the call site:

{{< highlight kotlin "linenos=table">}}
Person("Doe", "John", 27, 180)
{{< / highlight >}}

{{< admonition type=tip title="Tip 1" open=true >}}
Type aliases do not introduce new types. They are equivalent to the corresponding underlying types. When you define `typealias Name = String` and use `Name` in your code, the Kotlin compiler always expands it to `String`.
{{< /admonition >}}

{{< admonition type=tip title="Tip 2" open=true >}}
Value classes introduce a truly new type, contrary to type aliases which only introduce an alternative name (alias) for an existing type.
{{< /admonition >}}

{{< admonition type=tip title="Tip 3" open=true >}}
Value classes are compiled to their underlying type.
{{< /admonition >}}

If you'd like to learn more about `value class`, you can check [here](https://kotlinlang.org/docs/inline-classes.html#inline-classes-and-delegation).
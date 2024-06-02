---
title: "The domain layer and error handling"
date: 2024-06-01T22:23:53+02:00
draft: false
featuredImage: "/images/blog/error_handling_in_domain_layer.webp"
featuredImagePreview: "/images/blog/error_handling_in_domain_layer.webp"
---

The domain layer is the heart of your application, where business rules are defined and enforced.
One critical aspect of these rules is error handling, which must be as detailed as the business requirements dictate.
It's the domain layer that determines the granularity of error handling, ensuring that errors are managed 
appropriately based on the specific needs of the business.

Let's consider the following example:

{{< highlight kotlin "linenos=table">}}
data class Data(val a: Int, val b: Int)

interface Repository {
    fun getData(): Data?
}
{{< / highlight >}}

In this case, the domain layer doesn't concern itself with why the `getData()` function fails to fetch `Data`.
The specific reasons for the failure—whether due to network issues or other problems—are not its concern.
Depending on the type of product, this decision might impact the user experience, 
often resulting in a generic error message displayed to the user.

## Tools for error handling you don't need!

While the [kotlin.Result](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-result/) class is a popular choice 
for wrapping errors, and [Arrow](https://arrow-kt.io/) offers extensive tools for this purpose, 
these tools are not strictly necessary. Kotlin's sealed interfaces can provide comprehensive error handling capabilities. 
Let's demonstrate this with a coffee machine example that uses various ingredients:

{{< highlight kotlin "linenos=table">}}
class Beans
class Powder
class Water
class Coffee(water: Water, powder: Powder)
{{< / highlight >}}

## Defining business rules

Let's naively assume the machine works like the following:
1. Fetch water.
2. Fetch beans.
3. Grind beans into powder.
4. Brew coffee using the powder and water.

Each step can fail in different ways. Let's see how the domain layer can define the coffee machine's behavior 
together with the expected errors.

### Brewing coffee

Starting with the brewing process, the `BrewResult` can be either `Success` or `Failure`,
with Failure having specific cases like `InsufficientPowder`:

{{< highlight kotlin "linenos=table">}}
interface Repository {
    fun brew(powder: Powder, water: Water): BrewResult
}

sealed interface BrewResult {
    class Success(val coffee: Coffee) : BrewResult
    sealed interface Failure : BrewResult {
        data object InsufficientPowder : Failure
        data object InsufficientWater : Failure
        data object BrewerBroken : Failure
    }
}
{{< / highlight >}}

### Grinding beans

Next, we handle the grinding process. Notice how `GrindBeansResult.Failure` extends `BrewResult.Failure`. 
This is logical because a failure in grinding means a failure in brewing—no powder means no coffee.
However, `GrindBeansResult.Success` is not of type `BrewResult.Success`,
as grinding is just one step in making a cup of coffee. The same pattern is used with the following definitions as well.

{{< highlight kotlin "linenos=table">}}
interface Repository {
    fun grindBeans(beans: Beans): GrindBeansResult
    fun brew(powder: Powder, water: Water): BrewResult
}

sealed interface GrindBeansResult {
    class Success(val powder: Powder) : GrindBeansResult
    sealed interface Failure : GrindBeansResult, BrewResult.Failure {
        data object GrinderBroken : Failure
        data object InsufficientBeans : Failure
    }
}
{{< / highlight >}}

 ### Fetching beans

The business expects the following from the fetch beans step. The only reason `GetBeansResult` may end up
in a failure is running out of beans - `GetBeansResult.Empty`.

{{< highlight kotlin "linenos=table">}}
interface Repository {
    fun getBeans(): GetBeansResult
    fun grindBeans(beans: Beans): GrindBeansResult
    fun brew(powder: Powder, water: Water): BrewResult
}

sealed interface GetBeansResult {
    class Success(val beans: Beans) : GetBeansResult
    data object Empty : GetBeansResult, BrewResult.Failure
}
{{< / highlight >}}

 ### Fetching water

Similarly, fetching water can fail with no water available-`GetWaterResult.Empty`:

{{< highlight kotlin "linenos=table">}}
interface Repository {
    fun getWater(): GetWaterResult
    fun getBeans(): GetBeansResult
    fun grindBeans(beans: Beans): GrindBeansResult
    fun brew(powder: Powder, water: Water): BrewResult
}

sealed interface GetWaterResult {
    class Success(val water: Water) : GetWaterResult
    data object Empty : GetWaterResult, BrewResult.Failure
}
{{< / highlight >}}

## Implementing coffee machine

These definitions convey all the necessary information about _what_ the coffee machine needs to function. 
From the user's perspective, making coffee is as simple as pushing a button. Here's the interface for our coffee machine:

{{< highlight kotlin "linenos=table">}}
interface CoffeeMachine {
    fun brew(): BrewResult
}
{{< / highlight >}}

Now, let's implement the `CoffeeMachine` leveraging the flexibility of sealed interfaces for error handling:

{{< highlight kotlin "linenos=table">}}
class CoffeeMachineImpl(
    private val repository: Repository,
) : CoffeeMachine {
    override fun brew(): BrewResult {
        val water = when(val getWaterResult = repository.getWater()) {
            is GetWaterResult.Success -> getWaterResult.water
            is GetWaterResult.Empty -> return getWaterResult
        }
        val beans = when (val getBeansResult = repository.getBeans()) {
            is GetBeansResult.Success -> getBeansResult.beans
            is GetBeansResult.Empty -> return getBeansResult
        }
        val powder = when (val grindBeansResult = repository.grindBeans(beans)) {
            is GrindBeansResult.Success -> grindBeansResult.powder
            is GrindBeansResult.Failure -> return grindBeansResult
        }
        return repository.brew(powder, water)
    }
}
{{< / highlight >}}

In this implementation, lines #7, #11, and #15 directly return the failure. 
This approach avoids nested checks or type mappings. Moreover, the caller benefits from a detailed hierarchy of errors, 
clearly indicating where the error occurred:

{{< highlight kotlin "linenos=table">}}
when (val brewResult = coffeeMachine.brew()) {
    is BrewResult.Success -> println("Enjoy your ${brewResult.coffee}")
    is BrewResult.Failure.BrewerBroken -> println("Brewer is broken")
    is BrewResult.Failure.InsufficientWater -> println("You did not use enough water")
    is BrewResult.Failure.InsufficientPowder -> println("You did not use enough powder")
    is GetWaterResult.Empty -> println("Sorry, we're out of water")
    is GetBeansResult.Empty -> println("Sorry, we're out of beans")
    is GrindBeansResult.Failure.GrinderBroken -> println("Sorry, your grinder seems to be broken")
    is GrindBeansResult.Failure.InsufficientBeans -> println("Sorry, you need more beans to create powder")
}
{{< / highlight >}}
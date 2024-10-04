---
title: "Data flow vs. dependency direction"
date: 2024-05-19T18:44:05+02:00
draft: false
featuredImage: "/images/blog/data_flow_vs_dependency_direction.webp"
featuredImagePreview: "/images/blog/data_flow_vs_dependency_direction.webp"
---

Imagine you're building a complex application with several layers: a presentation layer for user interactions, a domain layer for business rules, and a data layer for managing data. One common pitfall developers face is confusing data flow direction with dependency direction, often assuming they must be the same. But here’s a crucial question: Can dependency direction differ from data flow direction? Yes, it can, and knowing how is vital for creating a robust architecture.

## Defining stability
To understand this better, let's delve into the concept of *stability*. In his book "Clean Architecture: A Craftsman's Guide to Software Structure and Design," Uncle Bob defines stability as follows:

> Stability refers to the likelihood that a software component will change. More specifically, it is about how resistant a component is to change, where a stable component is one that is difficult to change.

Picture a massive, intricate machine. If a part is large, complex, and has many connections, it's harder to replace or modify. Similarly, a software component is stable (hard to change) because:
1. It's big
2. It's complex
3. It lacks clarity
4. **Many other components depend on it**

For our discussion, we’ll focus on point 4: dependency.

## Architecture layers
Let's assume our architecture has three layers: presentation, domain, and data.

- **Presentation Layer**: Handles all user interactions.
- **Domain Layer**: Contains the business rules and logic.
- **Data Layer**: Manages data access and persistence mechanisms.

In an ideal world, the domain layer is the most stable, as it contains the core business logic that rarely changes. The other layers should depend on the domain layer. Here's what the ideal dependency direction looks like:

{{< image src="/images/blog/data_flow_vs_dependency_direction/ideal_dependency_direction.webp">}}

In this setup, changes in the presentation or data layers don’t affect the domain layer. However, data flows from the presentation layer to the data layer or vice versa, as shown below:

{{< image src="/images/blog/data_flow_vs_dependency_direction/data_flow_direction.webp">}}

## Maintaining ideal dependency direction
So, how can we ensure an ideal dependency direction regardless of the data flow direction? Enter the **Dependency Inversion Principle**. Let’s explore this with a practical example. Consider a simple `Repository` class that fetches data and returns a domain model:
 
{{< highlight kotlin "linenos=table">}}
class Repository(
    private val service: Service,
) {
    suspend fun getData(): ADomainModel = Dispatchers.IO {
        val aDataModel = service.getData()
        return@IO aDataModel.toDomainModel()
    }
}
{{< / highlight >}}

The `toDomainModel()` extension function maps a data model to its respective domain model. But where does this Repository class belong? It accesses data, so it might seem logical to place it in the data layer. Let’s visualize this:

{{< image src="/images/blog/data_flow_vs_dependency_direction/repository_in_data_layer.webp">}}

Here, the `Repository` depends on the domain layer to access `ADomainModel`. Simultaneously, the domain layer needs to depend on the data layer to access the `Repository`, creating a *circular dependency*. This isn’t feasible.

To resolve this, we can place the Repository in the domain layer. Here’s how the dependency diagram looks now:

{{< image src="/images/blog/data_flow_vs_dependency_direction/repository_in_domain_layer.webp">}}

This approach works but can lead to identical data flow and dependency directions. So, how can we apply the **Dependency Inversion Principle** to have all layers depend on the domain layer?

The domain layer should specify its requirements without worrying about implementation details. Let’s define an interface for the `Repository`:

{{< highlight kotlin "linenos=table">}}
interface Repository {
    suspend fun getData(): ADomainModel
}
{{< / highlight >}}

The data layer then implements this contract:

{{< highlight kotlin "linenos=table">}}
class RepositoryImpl(
    private val service: Service,
) {
    override suspend fun getData(): ADomainModel = Dispatchers.IO {
        val aDataModel = service.getData()
        return@IO aDataModel.mapToDomainModel()
    }
}
{{< / highlight >}}

Here’s the new dependency diagram:

{{< image src="/images/blog/data_flow_vs_dependency_direction/repository_api_impl.webp">}}

The domain layer no longer depends on the data layer. Using the **Dependency Inversion Principle**, we successfully reversed the dependency without affecting the data flow direction. This simple and effective approach allows you to maintain control over the dependency direction of your entire system.

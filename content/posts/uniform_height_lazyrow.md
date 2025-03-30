---
title: "Uniform Height LazyRow in Jetpack Compose"
date: 2025-03-30T19:01:27+02:00
draft: false
featuredImage: "/images/blog/uniform_height_lazyrow.webp"
featuredImagePreview: "/images/blog/uniform_height_lazyrow.webp"
---

What would you do if you needed a `LazyRow` where all items are forced to have the same height?

There’s no perfect solution, as enforcing uniform height means every item must be measured—negating the performance benefits of using a `LazyRow` in the first place.
But if you're aware of the trade-offs, we can aim for a solution that’s readable, maintainable, and “lazy enough” for many use cases.

## Option 1: A `Row` with a custom `SnapLayoutInfoProvider`
This works well when all items have the same width.
For example, [this implementation](https://cs.android.com/androidx/platform/frameworks/support/+/androidx-main:compose/foundation/foundation/integration-tests/foundation-demos/src/main/java/androidx/compose/foundation/demos/snapping/RowSnapLayoutInfoProvider.kt) provides snapping behavior similar to that of a `LazyRow`.

However, supporting items with varying widths would require a custom `LazyListLayoutInfo` to track each item's index and size.
At that point, you’re essentially re-implementing `LazyRow` from scratch—which is hard to justify in terms of maintainability.

## Option2: A semi-custom `LazyRow`
What if we mimicked `LazyRow`'s measurement pass, calculated the maximum height of all items up front, and then used that to set the row’s height?

Yes, this breaks the "lazy" aspect, but we’ll keep calling it `UniformHeightLazyRow` for simplicity.

Here's what a standard `LazyRow` looks like:

{{< highlight kotlin "linenos=table">}}
@Preview
@Composable
private fun NormalLazyRowPreview() {
    Theme {
        val items = persistentListOf("Item1", "Item2 but very very very long", "Item 3 medium long")
        LazyRow(
            contentPadding = PaddingValues(10.dp),
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            stickyHeader {
                Text(
                    modifier = Modifier
                        .width(50.dp)
                        .background(Color.Green),
                    text = "Sticky Header",
                )
            }
            item {
                Text(
                    modifier = Modifier
                        .background(Color.Yellow)
                        .width(40.dp),
                    text = "Single item before other items",
                )
            }
            itemsIndexed(items) { index, item ->
                Text(
                    modifier = Modifier
                        .background(Color.Yellow)
                        .fillParentMaxWidth(0.1f),
                    text = "$index: $item",
                )
            }
        }
    }
}
{{< / highlight >}}

> `Modifier.fillParentMaxHeight()` only has an effect when the `LazyRow` has a fixed height, which is not the case here.

{{< image src="/images/blog/uniform_height_lazyrow/normal_lazyrow_preview.webp">}}

### Capturing Items via Custom Scope

`LazyRow` uses `LazyListScope` to define its content:

{{< highlight kotlin "linenos=table">}}
@Composable
fun LazyRow(
    ...
    content: LazyListScope.() -> Unit
)
{{< / highlight >}}

{{< highlight kotlin "linenos=table">}}
interface LazyListScope {
    // Adds a single item.
    fun item(
        key: Any? = null,
        contentType: Any? = null,
        content: @Composable LazyItemScope.() -> Unit
    )

    // Adds a [count] of items.
    fun items(
        count: Int,
        key: ((index: Int) -> Any)? = null,
        contentType: (index: Int) -> Any? = { null },
        itemContent: @Composable LazyItemScope.(index: Int) -> Unit
    )

    // Adds a sticky header item
    fun stickyHeader(
        key: Any? = null,
        contentType: Any? = null,
        content: @Composable LazyItemScope.() -> Unit
    )
}
{{< / highlight >}}

To build our version, we need a similar interface—except our item content will also accept a `Modifier` parameter that we’ll use later to enforce height.

Here’s the core of `UniformHeightLazyListScope`:

{{< highlight kotlin "linenos=table">}}
class UniformHeightLazyListScope {
    data class ItemEntry(
        val key: Any?,
        val contentType: Any?,
        val content: @Composable LazyItemScope.(Modifier) -> Unit,
    )

    // Accumulate each item in the order they're added
    val items = mutableListOf<ItemEntry>()
    var stickyHeader: ItemEntry? = null

    fun item(
        key: Any? = null,
        contentType: Any? = null,
        content: @Composable LazyItemScope.(Modifier) -> Unit,
    ) {
        items += ItemEntry(key, contentType, content)
    }

    fun items(
        count: Int,
        key: ((index: Int) -> Any)? = null,
        contentType: (index: Int) -> Any? = { null },
        itemContent: @Composable LazyItemScope.(index: Int, modifier: Modifier) -> Unit,
    ) {
        repeat(count) { index ->
            items += ItemEntry(key?.invoke(index), contentType.invoke(index)) { modifier ->
                itemContent(index, modifier)
            }
        }
    }

    inline fun <T> itemsIndexed(
        items: List<T>,
        noinline key: ((index: Int, item: T) -> Any)? = null,
        crossinline contentType: (index: Int, item: T) -> Any? = { _, _ -> null },
        crossinline itemContent: @Composable LazyItemScope.(index: Int, modifier: Modifier, item: T) -> Unit,
    ) = items(
        count = items.size,
        key = if (key != null) { index: Int -> key(index, items[index]) } else null,
        contentType = { index -> contentType(index, items[index]) },
    ) { index, modifier ->
        itemContent(index, modifier, items[index])
    }

    fun stickyHeader(
        key: Any? = null,
        contentType: Any? = null,
        content: @Composable LazyItemScope.(Modifier) -> Unit,
    ) {
        stickyHeader = ItemEntry(key, contentType, content)
    }
}
{{< / highlight >}}

### Implementing `UniformHeightLazyRow`

We now define a `UniformHeightLazyRow` with the same parameters as a normal `LazyRow`, but with a custom content scope.

{{< highlight kotlin "linenos=table">}}
@Composable
fun UniformHeightLazyRow(
    modifier: Modifier = Modifier,
    state: LazyListState = rememberLazyListState(),
    contentPadding: PaddingValues = PaddingValues(0.dp),
    reverseLayout: Boolean = false,
    horizontalArrangement: Arrangement.Horizontal =
        if (!reverseLayout) Arrangement.Start else Arrangement.End,
    verticalAlignment: Alignment.Vertical = Alignment.Top,
    flingBehavior: FlingBehavior = ScrollableDefaults.flingBehavior(),
    userScrollEnabled: Boolean = true,
    content: UniformHeightLazyListScope.() -> Unit,
)
{{< / highlight >}}

Using `SubcomposeLayout`, we render the contents once just to measure their heights, identify the tallest one, and apply that height to the final `LazyRow`.

Here’s how we measure the height:

{{< highlight kotlin "linenos=table">}}
val density = LocalDensity.current
val layoutDirection = LocalLayoutDirection.current

SubcomposeLayout(modifier) { constraints ->
    val leftPadPx = with(density) { contentPadding.calculateLeftPadding(layoutDirection).toPx() }
    val rightPadPx = with(density) { contentPadding.calculateRightPadding(layoutDirection).toPx() }
    val totalHorizontalPaddingPx = leftPadPx + rightPadPx
    val topPadPx = with(density) { contentPadding.calculateTopPadding().toPx() }
    val bottomPadPx = with(density) { contentPadding.calculateBottomPadding().toPx() }
    val totalVerticalPaddingPx = topPadPx + bottomPadPx

    val capturingScope = UniformHeightLazyListScope()
    capturingScope.content()

    // Measure children as if they have (maxWidth - padding) available
    val measureMaxWidth = (constraints.maxWidth - totalHorizontalPaddingPx).coerceAtLeast(0f).toInt()
    val itemConstraints = constraints.copy(
        maxWidth = measureMaxWidth,
        minWidth = 0,
    )
    val placeables = subcompose("preMeasure") {
        lazyItemScope ???
        capturingScope.stickyHeader?.content?.invoke(lazyItemScope, Modifier)
        for ((_, _, itemContent) in capturingScope.items) {
            itemContent(lazyItemScope, Modifier)
        }
    }.map { measurable ->
        measurable.measure(itemConstraints)
    }

    // Find the tallest
    val maxHeightPx = placeables.maxOfOrNull { it.height } ?: constraints.minHeight
    val maxHeightDp = with(density) { maxHeightPx.toDp() + totalVerticalPaddingPx.toDp() }
    ...
}
{{< / highlight >}}

Ah, an instance of `LazyItemScope` needs to be passed to the items. Let's do a quick implementation of it.

Since we explicitly measure and enforce the row’s height, `fillParentMaxHeight` can be ignored.
Similarly, `fillParentMaxSize` will only affect width.

{{< highlight kotlin "linenos=table">}}
private class UniformHeightLazyItemScope : LazyItemScope {
    override fun Modifier.fillParentMaxHeight(fraction: Float): Modifier = this
    override fun Modifier.fillParentMaxSize(fraction: Float): Modifier = this.fillMaxWidth(fraction)
    override fun Modifier.fillParentMaxWidth(fraction: Float): Modifier = this.fillMaxWidth(fraction)
}
{{< / highlight >}}

Let's repeat the previous code with a working instance of `LazyItemScope`:

{{< highlight kotlin "linenos=table">}}
val density = LocalDensity.current
val layoutDirection = LocalLayoutDirection.current

SubcomposeLayout(modifier) { constraints ->
    val leftPadPx = with(density) { contentPadding.calculateLeftPadding(layoutDirection).toPx() }
    val rightPadPx = with(density) { contentPadding.calculateRightPadding(layoutDirection).toPx() }
    val totalHorizontalPaddingPx = leftPadPx + rightPadPx
    val topPadPx = with(density) { contentPadding.calculateTopPadding().toPx() }
    val bottomPadPx = with(density) { contentPadding.calculateBottomPadding().toPx() }
    val totalVerticalPaddingPx = topPadPx + bottomPadPx

    val capturingScope = UniformHeightLazyListScope()
    capturingScope.content()

    // Measure children as if they have (maxWidth - padding) available
    val measureMaxWidth = (constraints.maxWidth - totalHorizontalPaddingPx).coerceAtLeast(0f).toInt()
    val itemConstraints = constraints.copy(
        maxWidth = measureMaxWidth,
        minWidth = 0,
    )
    val placeables = subcompose("preMeasure") {
        val lazyItemScope = UniformHeightLazyItemScope()
        capturingScope.stickyHeader?.content?.invoke(lazyItemScope, Modifier)
        for ((_, _, itemContent) in capturingScope.items) {
            itemContent(lazyItemScope, Modifier)
        }
    }.map { measurable ->
        measurable.measure(itemConstraints)
    }

    // Find the tallest
    val maxHeightPx = placeables.maxOfOrNull { it.height } ?: constraints.minHeight
    val maxHeightDp = with(density) { maxHeightPx.toDp() + totalVerticalPaddingPx.toDp() }
    ...
}
{{< / highlight >}}

Once we have the tallest item's height, we apply it directly to the inner `LazyRow`:

{{< highlight kotlin "linenos=table">}}
val lazyRowMeasurable = subcompose("lazyRow") {
            LazyRow(
                modifier = Modifier.height(maxHeightDp),
                state = state,
                contentPadding = contentPadding,
                horizontalArrangement = horizontalArrangement,
                verticalAlignment = verticalAlignment,
                flingBehavior = flingBehavior,
                reverseLayout = reverseLayout,
                userScrollEnabled = userScrollEnabled,
            ) {
                ...
            }
{{< / highlight >}}

> `Modifier.fillParentMaxHeight()` now works, because the `LazyRow` has a fixed height.

We can pass `Modifier.fillParentMaxHeight()` to items via the content lambda: `content: @Composable LazyItemScope.(Modifier) -> Unit,`

{{< highlight kotlin "linenos=table">}}
@Composable
fun UniformHeightLazyRow(
    modifier: Modifier = Modifier,
    state: LazyListState = rememberLazyListState(),
    contentPadding: PaddingValues = PaddingValues(0.dp),
    reverseLayout: Boolean = false,
    horizontalArrangement: Arrangement.Horizontal =
        if (!reverseLayout) Arrangement.Start else Arrangement.End,
    verticalAlignment: Alignment.Vertical = Alignment.Top,
    flingBehavior: FlingBehavior = ScrollableDefaults.flingBehavior(),
    userScrollEnabled: Boolean = true,
    content: UniformHeightLazyListScope.() -> Unit,
) {
    ...

    SubcomposeLayout(modifier) { constraints ->
        ...

        // Find the tallest
        val maxHeightPx = placeables.maxOfOrNull { it.height } ?: constraints.minHeight
        val maxHeightDp = with(density) { maxHeightPx.toDp() + totalVerticalPaddingPx.toDp() }

        val lazyRowMeasurable = subcompose("lazyRow") {
            LazyRow(
                modifier = Modifier.height(maxHeightDp),
                ...
            ) {
                capturingScope.stickyHeader?.let {
                    stickyHeader(it.key, it.contentType) {
                        it.content(this@stickyHeader, Modifier.fillParentMaxHeight())
                    }
                }
                for ((key, contentType, itemContent) in capturingScope.items) {
                    item(key = key, contentType = contentType) {
                        itemContent(Modifier.fillParentMaxHeight())
                    }
                }
            }
        }.first() // "lazyRow" is the only element

        // Measure that LazyRow with the original constraints
        val lazyRowPlaceable = lazyRowMeasurable.measure(constraints)

        // Lay out the LazyRow in the space we have
        layout(lazyRowPlaceable.width, lazyRowPlaceable.height) {
            lazyRowPlaceable.placeRelative(0, 0)
        }
    }
}
{{< / highlight >}}

The API usage is nearly identical to `LazyRow`, except for the added `modifier` parameter in the item content lambdas:

{{< highlight kotlin "linenos=table">}}
@Preview
@Composable
private fun UniformHeightLazyRowPreview() {
    Theme {
        val items = persistentListOf("Item1", "Item2 but very very very long", "Item 3 medium long")
        UniformHeightLazyRow(
            contentPadding = PaddingValues(10.dp),
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            stickyHeader { modifier ->
                Text(
                    modifier = modifier
                        .width(50.dp)
                        .background(Color.Green),
                    text = "Sticky Header",
                )
            }
            item { modifier ->
                Text(
                    modifier = modifier
                        .background(Color.Yellow)
                        .width(40.dp),
                    text = "Single item before other items",
                )
            }
            itemsIndexed(items) { index, modifier, item ->
                Text(
                    modifier = modifier
                        .background(Color.Yellow)
                        .fillParentMaxWidth(0.1f),
                    text = "$index: $item",
                )
            }
        }
    }
}
{{< / highlight >}}

## Result

🎉 We now have a working `UniformHeightLazyRow`:

{{< image src="/images/blog/uniform_height_lazyrow/uniform_height_lazyrow_preview.webp">}}

This component isn't optimized for long lists (and shouldn't be used as such).
If your dataset is small enough to work with a regular `Row`, this approach should work just as well—with the added bonus of supporting `LazyRow`-like scrolling and snapping behavior.

And the best part? We didn’t re-implement `LazyRow`. We simply wrapped it with some measurement logic and a couple of simple interfaces.
That means your code stays relatively future-proof if `LazyRow` evolves over time.

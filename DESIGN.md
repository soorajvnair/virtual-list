# Virtual list pieces

This document gives an overview of various pieces we use to build up the `<virtual-list>` element. For now we are considering these implementation details. A future proposal may expose these building blocks more directly, but only after significant refinement.

## VirtualRepeater (Repeats mixin)

- Orchestrates DOM creation and layouting, ensures minimum number of nodes is created.
- Given an `items` array, it displays `num` elements starting from `first` index.
- Delegates DOM creation, update and recycling via `newChild, updateChild, recycleChild`.
- Delegates DOM layout via `_measureCallback`.

### Basic setup

```js
const repeater = new VirtualRepeater({
  /**
   * The data model.
   */
  items: new Array(20).fill({name: 'item'}),
  /**
   * From which index to start.
   */
  first: 0,
  /**
   * How many items to render.
   */
  num: 5,
  /**
   * Where to render the list items.
   */
  container: document.body,
  /**
   * The DOM representing data.
   */
  newChild: (item, index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + item.name;
    return child;
  }
});
```

### Recycling

You can recycle DOM through the `recycleChild`, and use the recycled DOM
in `newChild`.

If you decide to keep the recycled DOM attached in the main document, perform
DOM updates in `updateChild`.

```js
/**
 * Used to collect and recycle DOM.
 */
const pool = [];
const repeater = new VirtualRepeater({
  container: document.body,
  /**
   * The DOM representing data.
   */
  newChild: (item, index) => {
    return pool.pop() || document.createElement('section');
  },
  /**
   * Updates the DOM with data.
   */
  updateChild: (child, item, index) => {
    child.textContent = index + ' - ' + item.name;
  },
  /**
   * Invoked when the DOM is about to be removed.
   * Here we keep the child in the main document.
   */
  recycleChild: (child, item, index) => {
    pool.push(child);
  }
});

/**
 * Now, when we manipulate `items, first, num` properties,
 * the DOM will be recycled.
 */
repeater.items = new Array(20).fill({name: 'item'});
repeater.num = 5;
setTimeout(() => {
  repeater.num = 2;
}, 1000);

```

### Data manipulation

Updates to the `items` array instance will not be captured by VirtualRepeater.

Either set a new array to trigger the update, or use `requestReset()` to notify of changes.

```js
/**
 * You can set a new `items` array.
 */
repeater.items = repeater.items.concat([{name: 'new item'}]);
/**
 * You can also use `requestReset()` to notify of changes.
 */
repeater.items.push({name: 'new item'});
repeater.requestReset();
```

### Protected methods/properties

#### _incremental

Set to true to disable DOM additions/removals done by VirtualRepeater.

#### _measureCallback()

You can receive child layout information through `_measureCallback`,
which will get invoked after each rendering.
```js
repeater._measureCallback = (measuresInfo) => {
  for (const itemIndex in measuresInfo) {
    const itemSize = measuresInfo[itemIndex];
    console.log(`item at index ${itemIndex}`);
    console.log(`width: ${itemSize.width}, height: ${itemSize.height}`);
  }
};
```

## Layout

Given a viewport size and total items count, it computes children position, container size, range of visible items, and scroll error.

```js
const layout = new Layout({
  viewportSize: {height: 1000},
  totalItems: 20,
  /**
   * Layout direction, vertical (default) or horizontal.
   */
  direction: 'vertical',
  /**
   * Average item size (default).
   */
  itemSize: {height: 100},
});
```

It notifies subscribers about changes on range (e.g. `first, num`), item position, scroll size, scroll error. It's up to the listeners to take action on these.

```js
layout.addEventListener('rangechange', (event) => {
  const range = event.detail;
  console.log(`update first to ${range.first}`);
  console.log(`update num to ${range.num}`);
});

layout.addEventListener('itempositionchange', (event) => {
  const positionInfo = event.detail;
  for (const itemIndex in positionInfo) {
    const itemPosition = positionInfo[itemIndex];
    console.log(`item at index ${itemIndex}`);
    console.log(`update position to ${itemPosition.top}`);
  }
});

layout.addEventListener('scrollsizechange', (event) => {
  const size = event.detail;
  console.log(`update container size to ${size.height}`);
});

layout.addEventListener('scrollerrorchange', (event) => {
  const error = event.detail;
  console.log(`account for scroll error of ${error.top}`);
});
```

Use `layout.updateItemSizes()` to give layout more information regarding item sizes.
```js
// Pass an object with key = item index, value = bounds.
layout.updateItemSizes({
  0: {height: 300},
  4: {height: 100},
});
```

Use `layout.scrollTo()` to move the range across the container size.
```js
const el = document.scrollingElement;
el.addEventListener('scroll', () => {
  layout.scrollTo({top: el.scrollTop});
});
```

## VirtualList (RepeatsAndScrolls mixin)

- Extends `VirtualRepeater`, delegates the updates of `first, num` to a `Layout` instance
- Exposes a `layout` property, updates the `layout.totalItems`, `layout.viewportSize`, and the scroll position (`layout.scrollTo()`)
- Subscribes to `layout` updates on range (`first, num`), children position, scrolling position and scrolling size
- Updates the container size (`min-width/height`) and children positions (`position: absolute`)

```js
const list = new VirtualList({
  /**
   * The layout in charge of computing `first, num`,
   * children position, scrolling position and scrolling size.
   */
  layout: new Layout(),
  /**
   * Where to render the list items.
   */
  container: document.body,
  /**
   * The data model.
   */
  items: new Array(20).fill({name: 'item'}),
  /**
   * The DOM representing data.
   */
  newChild: (item, index) => {
    const child = document.createElement('section');
    child.textContent = index + ' - ' + item.name;
    return child;
  }
});
```

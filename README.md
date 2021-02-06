# aredux - async ES6 redux knockoff
Redux-like store/reducer implementation with immutable states and ES6 async iterator dispatch. Also includes a react connector with efficient state updates.

Currently doesn't support middleware. The way I use it is that I just handle all network calls and similar in front of the reducer, i.e. directly from the action. But adding that probably wouldn't be hard.

The use of immutable.js is currently required.

## How to use
### Install
```
npm install --save aredux
```
Note: Sources are not transpiled, so will only work with ES6 capable bundler e.g. webpack with babel.

### Control flow
Each action originates from a component which dispatches it to a store. The action function can continue to emit streaming updates as long as it wants.

The reducer receives the incoming actions and can use it to permutate it's internal state. Finally the store asynchronously triggers updates to all subscribers.

#### React store
The react store subclass allows using ```store.connect()``` to wrap a react component which can then receive props directly from the store state. The react component will only be updated when it's passed props change.

```
                 +---------------------+
                 |       Store         |
                 |                     |
+-----------+    |   +----------+---------->+-----+
| Component +------->+  Action  |      |    | API |
+------+----+    |   +----+-----+<----------+-----+
       ^         |        |            |
       |         |        | Stream     |
       |         |        v            |
+------+-----+   |   +----+------+     |
|   State    +<------+  Reducer  |     |
+------------+   |   +-----------+     |
                 |                     |
                 +---------------------+

```
### store
```js
import {createStore} from "aredux/lib/react";
import reducer from "./reducer";

const store = createStore(reducer);
export default store;
```

### component (jsx)
```jsx
import store from "./store";
import {addRails} from "./action";

const build = () => store.dispatch(addRails(3, 300));
const slowBuild = () => store.dispatch(addRails(3, 1000));

const Element = ({rails}) => <div id="meshList">
  <h2>Railway Factory</h2>
  <button onClick={build}>Build</button>
  <button onClick={slowBuild}>SlowBuild</button>
  <p>{rails.join("")}</p>
</div>;

export default store.connect((props, state) => {
  props.set("rails", state);
})(Element);
```

### action
```js
export const ADDED_RAIL = "ADDED_RAIL";

function timeoutPromise(interval) {
  return new Promise(resolve => setTimeout(resolve, interval));
};

export async function *addRails(count, interval) {
  for (let i = 0; i < count; i++) {
    await timeoutPromise(interval);
    yield {type: ADDED_RAIL};
  }
};
```

### reducer
```js
import {List} from "immutable";
import {ADDED_RAIL} from "./action";

export default function railway(state = List(), action) {
  switch (action.type) {
  case ADDED_RAIL:
    state = state.push("=");
    break;
  }
};
```

## But why?
I can't really remember, but I believe the first time I looked at redux it seemed cool and small, but I also wanted it to have Immutable.js state. And apparently doing something similar was pretty easy in just a couple of lines.

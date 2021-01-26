import {Map} from "immutable";

function isEmpty(obj) {
  for(var key in obj) {
    if(obj.hasOwnProperty(key))
      return false;
  }
  return true;
}

function isAsyncIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.asyncIterator] === 'function';
}

function* entries(obj) {
   for (let key of Object.keys(obj)) {
     yield [key, obj[key]];
   }
}

export function combineReducers(reducers) {
  return function(state = Map(), action) {
    return state.withMutations(map => {
      for (let [key, func] of entries(reducers)) {
        map.set(key, func(map.get(key), action))
      }
    })
  }
}

export class Store {
  constructor(reducer) {
    this.subscriptions = [];
    this.reducer = reducer;
    this.state = reducer(undefined, {})
    this.changed = false;

    this._notify = this._notify.bind(this);
  }

  // called asynchronously to break call-loops and bundle updates
  _notify() {
    if (!this.changed) {
      return;
    }

    this.changed = false;

    for (let handler of this.subscriptions) {
      handler(this.state);
    }
  }

  _dispatch(action) {
    // console.log("dispatch", action)
    this.state = this.reducer(this.state, action);
    this.changed = true

    // async notification
    setTimeout(this._notify, 0);
  }

  // update state
  async dispatch(action) {
    // async action
    if (isAsyncIterable(action)) {
      for await (let part of action) {
        this._dispatch(part);
      }

    // plain action
    } else if (typeof action === "object") {
      this._dispatch(action);

    } else {
      throw new Error("Action is neither an object nor an async iterable")
    }
  }

  subscribe(handler) {
    if (typeof handler !== "function")
      throw new Error("No handler function passed to subscribe");

    this.subscriptions.push(handler);
    // console.log("subscribed", this.subscriptions.length)
    return () => {
      const index = this.subscriptions.indexOf(handler);
      if (index === -1)
        throw new Error("Unsubscribe called multiple times");
      this.subscriptions.splice(index, 1);
      // console.log("unsubscribed", this.subscriptions.length)
    }
  }
}

// createStore helper
export function createStore (...args) {
  return new Store(...args);
}

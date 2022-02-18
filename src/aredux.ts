import { Map } from 'immutable'

function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false
  }
  return typeof obj[Symbol.iterator] === 'function'
}

function isAsyncIterable<T>(obj: any): obj is AsyncIterableIterator<T> {
  // checks for null and undefined
  if (obj == null) {
    return false
  }
  return typeof obj[Symbol.asyncIterator] === 'function'
}

function* entries(obj) {
  for (const key of Object.keys(obj)) {
    yield [key, obj[key]]
  }
}

interface Action {
  type: string;
}

type Reducer<State> = (state: State, action: Action) => State

export function combineReducers(reducers) {
  if (!isIterable(reducers) && typeof reducers === 'object') {
    // wrap iterator around object
    reducers = entries(reducers)
  }
  if (!isIterable(reducers)) {
    throw new Error('combineReducers(): reducers must be an object or an iterable')
  }
  return function (state = Map<string,any>(), action: Action) {
    return state.withMutations(map => {
      for (const [key, func] of reducers) {
        map.set(key, func(map.get(key), action))
      }
    })
  }
}

export class Store<StoreState> {
  private _subscriptions: any[]
  private reducer: Reducer<StoreState>
  state: StoreState
  private changed: boolean

  constructor(reducer) {
    if (typeof (reducer) !== 'function') {
      throw new Error('aredux reducer must be a function')
    }
    this._subscriptions = []
    this.reducer = reducer
    this.state = reducer(undefined, {})
    this.changed = false

    this._notify = this._notify.bind(this)
  }

  // called asynchronously to break call-loops and bundle updates
  _notify() {
    if (!this.changed) {
      return
    }

    this.changed = false

    for (const handler of this._subscriptions) {
      handler(this.state)
    }
  }

  _dispatch(action) {
    this.state = this.reducer(this.state, action)
    this.changed = true

    // async notification
    setTimeout(this._notify, 0)
  }

  // update state
  async dispatch(action: Action | AsyncIterableIterator<Action>) {
    // async action
    if (isAsyncIterable<Action>(action)) {
      for await (const part of action) {
        this._dispatch(part)
      }
      // plain action
    } else if (typeof action === 'object') {
      this._dispatch(action)
    } else {
      throw new Error('Dispatched action is neither an object nor an async iterable')
    }
  }

  subscribe(handler) {
    if (typeof handler !== 'function') { throw new Error('No handler function passed to subscribe') }

    this._subscriptions.push(handler)
    return () => {
      const index = this._subscriptions.indexOf(handler)
      if (index === -1) { throw new Error('Unsubscribe called multiple times') }
      this._subscriptions.splice(index, 1)
    }
  }

  getState() {
    return this.state
  }
}

// createStore helper
export function createStore<T>(reducer: Reducer<T>) {
  if (typeof (reducer) !== 'function') {
    throw new Error('createStore(): reducer must be a function')
  }
  return new Store(reducer)
}

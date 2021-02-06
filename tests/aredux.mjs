import test from 'tape'
import { Store, combineReducers } from '../aredux.js'

const DID_FOO = 'DID_FOO'

function testReducer (state = {}, action) {
  switch (action.type) {
    case DID_FOO:
      state = { ...state, foo: action.foo }
      break
  }
  return state
}

async function wait (timeout) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout)
  })
}

test('test object dispatch', async function (t) {
  const store = new Store(testReducer)
  t.deepEqual(store.getState(), {}, 'default state')
  store.dispatch({ type: DID_FOO, foo: 2 })
  t.deepEqual(store.getState(), { foo: 2 }, 'object dispatch should be synchronous')
})

test('test async iterator dispatch', async function (t) {
  async function * action () {
    yield { type: DID_FOO, foo: 1 }
    yield { type: DID_FOO, foo: 2 }
    await wait(50)
    yield { type: DID_FOO, foo: 3 }
  }

  const store = new Store(testReducer)
  const now = Date.now()

  t.deepEqual(store.getState(), {}, 'default state')
  const p = store.dispatch(action())
  t.deepEqual(store.getState(), {}, 'async dispatch should be async')

  await wait(0)
  t.deepEqual(store.getState(), { foo: 2 }, 'should bundle both updates inside of timeout')

  await p
  t.deepEqual(store.getState(), { foo: 3 }, 'should complete')
  t.ok(Date.now() - now < 100, 'should complete in time')
})

test('test subscribe', async function (t) {
  const store = new Store(testReducer)

  t.throws(() => store.subscribe(), 'should complain about missing function')
  t.throws(() => store.subscribe({}), 'should complain about missing function')

  let res = null
  let updates = 0
  let updates2 = 0
  const unsub = store.subscribe(state => {
    res = state
    updates++
  })
  store.subscribe(state => {
    updates2++
  })

  // test notify
  store.dispatch({ type: DID_FOO, foo: 2 })
  t.equal(res, null, 'notify should not be sync')
  await wait(0)
  t.equal(updates, 1)
  t.deepEqual(res, { foo: 2 }, 'notify should be async')

  // test 'efficient' notify
  store.dispatch({ type: DID_FOO, foo: 3 })
  store.dispatch({ type: DID_FOO, foo: 4 })
  await wait(0)
  t.equal(updates, 2, 'notify should bundle updates')
  t.deepEqual(res, { foo: 4 }, 'notify should bundle updates correctly')

  // test unsubscribe
  unsub()
  store.dispatch({ type: DID_FOO, foo: 5 })
  await wait(0)
  t.deepEqual(store.getState(), { foo: 5 }, 'sanity')
  t.deepEqual(res, { foo: 4 }, 'unsub should work')
  t.equal(updates, 2, 'unsub should work')
  t.equal(updates2, 3, 'unsub should work')
})

test('test combine plain object', async function (t) {
  const comb = combineReducers({
    a: testReducer,
    b: testReducer
  })
  const state = comb(undefined, { type: DID_FOO, foo: 3 })
  t.deepEqual(state.get('a'), { foo: 3 })
  t.deepEqual(state.get('b'), { foo: 3 })
})

test('test combine iterator', async function (t) {
  const map = new Map()
  map.set('a', testReducer)
  map.set('b', testReducer)
  const comb = combineReducers(map)
  const state = comb(undefined, { type: DID_FOO, foo: 3 })
  t.deepEqual(state.get('a'), { foo: 3 })
  t.deepEqual(state.get('b'), { foo: 3 })
})

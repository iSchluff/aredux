import jsdom from 'global-jsdom'
import test from 'tape'
import React from 'react'
import { Map } from 'immutable'
import { render } from 'react-dom'
import { Store } from '../lib/aredux.js'
import { AreduxContext, Provider, connect } from '../lib/react.js'
jsdom()

const e = React.createElement

async function wait (timeout) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout)
  })
}

function useContainer (func) {
  return async function (t) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    await func(t, container)
    document.body.removeChild(container)
  }
}

test('test provider', useContainer(async function (t, container) {
  const store = new Store(() => ({ foo: 1 }))
  let gotStore = null

  const Tester = function () {
    return e(AreduxContext.Consumer, null, store => {
      gotStore = store
    })
  }

  t.equal(gotStore, null, 'sanity')
  render(e(Provider, { store }, e(Tester)), container)
  t.equal(gotStore, store, 'pass store via context')
}))

test('test connect', useContainer(async function (t, container) {
  const store = new Store((state, action) => Map(action))
  let got = null
  let gotDispatch = null
  let renders = 0

  const Tester = function ({ bar, dispatch }) {
    got = bar
    gotDispatch = dispatch
    renders++
    return null
  }

  const connected = connect((props, state) => {
    props.set('bar', state.get('foo'))
  })(Tester)

  render(e(Provider, { store }, e(connected)), container)
  t.equal(got, undefined, 'empty on first run')
  t.ok(typeof gotDispatch === 'function', 'pass dispatch via props')
  t.equal(renders, 1)

  gotDispatch({ foo: 1 })
  gotDispatch({ foo: 2 })
  await wait(0) // async notify
  t.equal(got, 2, 'got update')
  t.equal(renders, 2, 'bundled updates')

  gotDispatch({ foo: 3 })
  await wait(0) // async notify
  t.equal(got, 3, 'got update2')
  t.equal(renders, 3)

  gotDispatch({ foo: 3 })
  await wait(0) // async notify
  t.equal(renders, 3, 'prevented unnecessary rerender')
}))

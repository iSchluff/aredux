import { Map } from 'immutable'
import { Component, createElement, createContext } from 'react'
import { Store } from '../aredux.js'

export const AreduxContext = createContext(null)

export function Provider ({ store, ...props }) {
  if (!(store instanceof Store)) {
    throw new Error('Passed store must be aredux store')
  }
  return createElement(AreduxContext.Provider, { ...props, value: store })
}

// build connector
export function connect (mapStateToProps) {
  // connector-factory
  return (view) => {
    class Connector extends Component {
      constructor (...args) {
        super(...args)
        this.state = this.mutateState({
          childProps: Map()
        })
        this.handleUpdate = this.handleUpdate.bind(this)
      }

      UNSAFE_componentWillReceiveProps (newProps) {
        this.setState(this.mutateState(this.state, newProps))
      }

      mutateState (state, props = this.props) {
        const store = this.context
        if (!store) { return state }

        const newProps = state.childProps.withMutations((mut) => {
          if (props) { mut.merge(props) }

          if (mapStateToProps) {
            mapStateToProps(mut, store.state)
          }
        })
        return { childProps: newProps }
      }

      handleUpdate () {
        this.setState(this.mutateState(this.state))
      }

      componentDidMount () {
        const store = this.context
        this.unsubscribe = store.subscribe(this.handleUpdate)
      }

      componentWillUnmount () {
        this.unsubscribe()
      }

      shouldComponentUpdate (_, newState) {
        const oldProps = this.state.childProps
        const newProps = newState.childProps
        return newProps !== oldProps
      }

      render () {
        const store = this.context
        const props = this.state.childProps.toJS()
        if (store) { props.dispatch = store.dispatch.bind(store) }
        return createElement(view, props, null)
      }
    }
    Connector.contextType = AreduxContext
    return Connector
  }
}

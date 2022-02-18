import { Map } from 'immutable'
import * as React from 'react'
import { Component, createElement, createContext } from 'react'
import { Store } from './aredux.js'

export const AreduxContext = createContext(null)

export function Provider<StoreState>({ store, children }: { store: Store<StoreState>, children?: React.ProviderProps<null>["children"] }) {
  if (!(store instanceof Store)) {
    throw new Error('Passed store must be aredux store')
  }
  const props: React.ProviderProps<Store<StoreState>> = { value: store, children }
  return createElement<typeof props>(AreduxContext.Provider, props)
}

type MapFunc<StoreState> = (props: Map<string, any>, state: StoreState) => void;
type ComponentType = Parameters<typeof createElement>[0]| JSX.Element;

// build connector
export function connect<StoreState=Map<string, any>>(mapStateToProps: MapFunc<StoreState>): (view: ComponentType) => React.ComponentClass {
  // connector-factory
  return (view) => {
    class ConnectorImpl extends Component {
      declare state: Readonly<{ childProps: Map<string, any>, dispatch: Store<StoreState>["dispatch"] }>
      private _unsubscribe: () => void;
      static contextType = AreduxContext;

      constructor(props) {
        super(props)
        this.state = this.mutateState({
          childProps: Map()
        })
        this.handleUpdate = this.handleUpdate.bind(this)
      }

      UNSAFE_componentWillReceiveProps(newProps) {
        this.setState(this.mutateState(this.state, newProps))
      }

      mutateState(state, props = this.props) {
        const store: Store<StoreState> = this.context
        if (!store) { return state }

        const newProps = state.childProps.withMutations((mut) => {
          if (props) { mut.merge(props) }

          if (mapStateToProps) {
            mapStateToProps(mut, store.state)
          }
        })
        return { childProps: newProps }
      }

      handleUpdate() {
        this.setState(this.mutateState(this.state))
      }

      componentDidMount() {
        const store = this.context
        this._unsubscribe = store.subscribe(this.handleUpdate)
      }

      componentWillUnmount() {
        this._unsubscribe()
      }

      shouldComponentUpdate(_, newState) {
        const oldProps = this.state.childProps
        const newProps = newState.childProps
        return newProps !== oldProps
      }

      render() {
        const store = this.context
        const props: any = this.state.childProps.toJS()
        if (store) { props.dispatch = store.dispatch.bind(store) }
        return createElement(view as React.FunctionComponent, props, null)
      }
    }
    return ConnectorImpl
  }
}

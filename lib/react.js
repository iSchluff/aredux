import {Map} from "immutable";
import {Component} from "react";
import {Store} from "../aredux";


class ReactStore extends Store {
  constructor(...args) {
    super(...args);
    this.dispatch = this.dispatch.bind(this);
  }

  // build connector
  connect(mapStateToProps) {
    const store = this;

    // build wrapper-factory
    return (view) => {
      return class Connector extends Component {
        constructor(...args) {
          super(...args);
          this.state = this.mutateState({
            childProps: Map()
          });
          this.handleUpdate = this.handleUpdate.bind(this);
        }

        UNSAFE_componentWillReceiveProps(newProps) {
          this.setState(this.mutateState(this.state, newProps));
        }

        mutateState(state, props = this.props) {
          const newProps = state.childProps.withMutations((mut) => {
            if (props)
              mut.merge(props);

            if (mapStateToProps) {
              mapStateToProps(mut, store.state);
            }
          });
          return {childProps: newProps};
        }

        handleUpdate() {
          this.setState(this.mutateState(this.state))
        }

        componentDidMount() {
          this.unsubscribe = store.subscribe(this.handleUpdate);
        }

        componentWillUnmount() {
          this.unsubscribe();
        }

        shouldComponentUpdate(_, newState) {
          const oldProps = this.state.childProps;
          const newProps = newState.childProps;
          return newProps != oldProps;
        }

        render() {
          return React.createElement(view, this.state.childProps.toJS(), null);
        }
      }
    };
  }
}

export const createStore = function(...args) {
  return new ReactStore(...args);
}

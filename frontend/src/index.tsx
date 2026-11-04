import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import App from './App';
import rootReducer from './App/Redux/Reducers/reducers';
import rootSaga from './App/Redux/Sagas/rootsaga';
import './App/GlobalStyles/tokens.scss';
import './App/GlobalStyles/global.scss';

/*
 * Wire up Redux:
 *   store    holds the whole app state (built from all the reducers)
 *   saga     middleware that sees every dispatched action and runs side effects (API calls)
 *   Provider makes the store available to every component (useSelector / useDispatch)
 */
const sagaMiddleware = createSagaMiddleware();
const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(rootSaga);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Provider store={store}>
    <App />
  </Provider>,
);

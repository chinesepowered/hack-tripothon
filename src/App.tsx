import { Router, Route, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import { Landing } from './pages/Landing'
import { Create } from './pages/Create'
import { GiftView } from './pages/GiftView'
import { Board } from './pages/Board'

// Strip the "?query" part of the hash so routes match; pages read it via hashQuery().
function useHashPath(): [string, (to: string) => void] {
  const [loc, nav] = useHashLocation()
  return [loc.split('?')[0], nav]
}

export function App() {
  return (
    <Router hook={useHashPath}>
      <Switch>
        <Route path="/create" component={Create} />
        <Route path="/g/:data">{(p) => <GiftView key={p.data} data={p.data} />}</Route>
        <Route path="/board/:id?">{(p) => <Board id={p.id} />}</Route>
        <Route component={Landing} />
      </Switch>
    </Router>
  )
}

import DVB from './DVB'
import Admin from './Admin'

function App() {
  const isAdmin = window.location.pathname === "/admin";
  return isAdmin ? <Admin /> : <DVB />;
}

export default App

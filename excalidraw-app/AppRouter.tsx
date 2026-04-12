import { Router, Route, Switch } from "wouter";

import { EditorPage } from "./pages/EditorPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PresentationPage } from "./pages/PresentationPage";

/**
 * Top-level router. Each page manages its own Jotai Provider/store
 * as needed (EditorPage delegates to ExcalidrawApp which has its own).
 */
export const AppRouter = () => {
  return (
    <Router>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/scene/new" component={EditorPage} />
        <Route path="/scene/:id" component={EditorPage} />
        <Route path="/present/:id" component={PresentationPage} />
        <Route>
          <DashboardPage />
        </Route>
      </Switch>
    </Router>
  );
};

import { Router, Route, Switch, Redirect } from "wouter";

import { EditorPage } from "./pages/EditorPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PresentationPage } from "./pages/PresentationPage";

const LAST_SCENE_KEY = "excalidraw-last-scene-id";

export const getLastSceneId = () => localStorage.getItem(LAST_SCENE_KEY);
export const setLastSceneId = (id: string) =>
  localStorage.setItem(LAST_SCENE_KEY, id);

/**
 * "/" opens the last edited scene, or creates a new one if none exists.
 */
const HomePage = () => {
  const lastId = getLastSceneId();
  if (lastId) {
    return <Redirect to={`/scene/${lastId}`} />;
  }
  return <Redirect to="/scene/new" />;
};

/**
 * Top-level router. Each page manages its own Jotai Provider/store
 * as needed (EditorPage delegates to ExcalidrawApp which has its own).
 */
export const AppRouter = () => {
  return (
    <Router>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/scene/new" component={EditorPage} />
        <Route path="/scene/:id" component={EditorPage} />
        <Route path="/present/:id" component={PresentationPage} />
        <Route>
          <HomePage />
        </Route>
      </Switch>
    </Router>
  );
};

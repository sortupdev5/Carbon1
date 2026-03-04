import path from "node:path";
import type { RouteConfig } from "@react-router/dev/routes";

type DefineRoute = (
  path: string | undefined,
  file: string,
  optionsOrChildren?: any,
  children?: any
) => void;

function routeManifestToRouteConfig(routeManifest: any, rootId = "root") {
  let routeConfigById: any = {};
  for (let id in routeManifest) {
    let route = routeManifest[id];
    routeConfigById[id] = {
      id: route.id,
      file: route.file,
      path: route.path,
      index: route.index,
      caseSensitive: route.caseSensitive
    };
  }
  let routeConfig: any[] = [];
  for (let id in routeConfigById) {
    let route = routeConfigById[id];
    let parentId = routeManifest[route.id].parentId;
    if (parentId === rootId) {
      routeConfig.push(route);
    } else {
      let parentRoute = parentId && routeConfigById[parentId];
      if (parentRoute) {
        parentRoute.children = parentRoute.children || [];
        parentRoute.children.push(route);
      }
    }
  }
  return routeConfig;
}

function normalizeSlashes(file: string) {
  return file.replaceAll(path.win32.sep, "/");
}

function stripFileExtension(file: string) {
  return file.replace(/\.[a-z0-9]+$/i, "");
}

function createRouteId(file: string) {
  return normalizeSlashes(stripFileExtension(file));
}

const defineRoutes = (callback: (defineRoute: DefineRoute) => void) => {
  let routes: any = Object.create(null);
  let parentRoutes: any[] = [];
  let alreadyReturned = false;

  let defineRoute: DefineRoute = (path, file, optionsOrChildren, children) => {
    if (alreadyReturned) {
      throw new Error(
        "You tried to define routes asynchronously but started defining routes before the async work was done."
      );
    }
    let options: any;
    if (typeof optionsOrChildren === "function") {
      options = {};
      children = optionsOrChildren;
    } else {
      options = optionsOrChildren || {};
    }
    let route = {
      path: path ? path : undefined,
      index: options.index ? true : undefined,
      caseSensitive: options.caseSensitive ? true : undefined,
      id: options.id || createRouteId(file),
      parentId:
        parentRoutes.length > 0
          ? parentRoutes[parentRoutes.length - 1].id
          : "root",
      file
    };
    if (route.id in routes) {
      throw new Error(
        `Unable to define routes with duplicate route id: "${route.id}"`
      );
    }
    routes[route.id] = route;
    if (children) {
      parentRoutes.push(route);
      children();
      parentRoutes.pop();
    }
  };

  callback(defineRoute);
  alreadyReturned = true;
  return routes;
};

export function remixRoutesOptionAdapter(
  routes: (defineRoute: any) => any
): RouteConfig {
  let routeManifest = routes(defineRoutes);
  return routeManifestToRouteConfig(routeManifest) as unknown as RouteConfig;
}

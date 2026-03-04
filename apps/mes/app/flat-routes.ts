import * as fs from "node:fs";
import * as path from "node:path";
import { minimatch } from "minimatch";

interface RouteInfo {
  id: string;
  path?: string;
  file: string;
  name: string;
  segments: string[];
  index: boolean;
  parentId?: string;
}

interface FlatRouteOptions {
  appDir?: string;
  routeDir?: string | string[];
  basePath?: string;
  paramPrefixChar?: string;
  nestedDirectoryChar?: string;
  routeRegex?: RegExp;
  ignoredRouteFiles?: string[];
  visitFiles?: (
    dir: string,
    visitor: (file: string) => void,
    baseDir?: string
  ) => void;
  defineRoutes?: any;
}

const defaultOptions = {
  appDir: "app",
  routeDir: "routes",
  basePath: "/",
  paramPrefixChar: "$",
  nestedDirectoryChar: "+",
  routeRegex:
    /((\${nestedDirectoryChar}[/\\][^/\\:?*]+)|[/\\]((index|route|layout|page)|(_[^/\\:?*]+)|([^/\\:?*]+\.route)))\.(ts|tsx|js|jsx|md|mdx)$/
};

function normalizeSlashes(file: string) {
  return file.split(path.win32.sep).join("/");
}

function stripFileExtension(file: string) {
  return file.replace(/\.[a-z0-9]+$/i, "");
}

function createRouteId(file: string) {
  return normalizeSlashes(stripFileExtension(file));
}

function isIndexRoute(routeId: string, options: any) {
  const nestedDirectoryChar = options.nestedDirectoryChar.replace(
    /[.*+\-?^${}()|[\]\\]/g,
    "\\$&"
  );
  const indexRouteRegex = new RegExp(
    `((^|[.]|[${nestedDirectoryChar}]\\/)(index|_index))(\\/[^\\/]+)?$|(\\/_?index\\/)`
  );
  return indexRouteRegex.test(routeId);
}

function getRouteRegex(
  RegexRequiresNestedDirReplacement: RegExp,
  nestedDirectoryChar: string
) {
  nestedDirectoryChar = nestedDirectoryChar.replace(
    /[.*+\-?^${}()|[\]\\]/g,
    "\\$&"
  );
  return new RegExp(
    RegexRequiresNestedDirReplacement.source.replace(
      "\\${nestedDirectoryChar}",
      `[${nestedDirectoryChar}]`
    )
  );
}

function isRouteModuleFile(filename: string, routeRegex: RegExp) {
  let isFlatFile = !filename.includes(path.sep);
  if (isFlatFile) {
    return [".js", "jsx", ".ts", ".tsx", ".md", ".mdx"].includes(
      path.extname(filename)
    );
  }
  let isRoute = routeRegex.test(filename);
  if (isRoute) {
    let isServer = /\.server\.(ts|tsx|js|jsx|md|mdx)$/.test(filename);
    return !isServer;
  }
  return false;
}

function createRoutePath(
  routeSegments: string[],
  index: boolean,
  options: any
) {
  let result = "";
  let basePath = options.basePath ?? "/";
  let paramPrefixChar = options.paramPrefixChar ?? "$";
  if (index) {
    routeSegments[routeSegments.length - 1] = "";
  }
  for (let i = 0; i < routeSegments.length; i++) {
    let segment = routeSegments[i];
    if (segment.startsWith("_")) {
      continue;
    }
    if (segment.endsWith("_")) {
      segment = segment.slice(0, -1);
    }
    if (segment.startsWith(paramPrefixChar)) {
      if (segment === paramPrefixChar) {
        result += `/*`;
      } else {
        result += `/:${segment.slice(1)}`;
      }
    } else {
      result += `/${segment}`;
    }
  }
  if (basePath !== "/") {
    result = basePath + result;
  }
  if (result.endsWith("/")) {
    result = result.slice(0, -1);
  }
  return result || undefined;
}

function getRouteSegments(
  name: string,
  index: boolean,
  paramPrefixChar = "$",
  nestedDirectoryChar = "+"
) {
  let routeSegments: string[] = [];
  const escapedNestedDirectoryChar = nestedDirectoryChar.replace(
    /[.*+\-?^${}()|[\]\\]/g,
    "\\$&"
  );
  const combinedRegex = new RegExp(`${escapedNestedDirectoryChar}[/\\\\]`, "g");
  name = name.replace(combinedRegex, ".");

  if (!name.endsWith(".route")) {
    let last = name.lastIndexOf("/");
    if (last >= 0) {
      name = name.substring(0, last);
    }
  }

  routeSegments = name.split(/[/\\.]/).filter(Boolean);

  if (routeSegments.at(-1) === "route") {
    routeSegments = routeSegments.slice(0, -1);
  }
  return routeSegments;
}

function getRouteInfo(routeDir: string, file: string, options: any): RouteInfo {
  let filePath = normalizeSlashes(path.join(routeDir, file));
  let routeId = createRouteId(filePath);
  let routeIdWithoutRoutes = routeId.slice(routeDir.length + 1);
  let index = isIndexRoute(routeIdWithoutRoutes, options);
  let routeSegments = getRouteSegments(
    routeIdWithoutRoutes,
    index,
    options.paramPrefixChar,
    options.nestedDirectoryChar
  );
  let routePath = createRoutePath(routeSegments, index, options);
  return {
    id: routeId,
    path: routePath,
    file: filePath,
    name: routeSegments.join("/"),
    segments: routeSegments,
    index
  };
}

function findParentRouteId(
  routeInfo: RouteInfo,
  nameMap: Map<string, RouteInfo>
) {
  let parentName = routeInfo.segments.slice(0, -1).join("/");
  while (parentName) {
    if (nameMap.has(parentName)) {
      return nameMap.get(parentName)!.id;
    }
    parentName = parentName.substring(0, parentName.lastIndexOf("/"));
  }
  return undefined;
}

function defaultVisitFiles(
  dir: string,
  visitor: (file: string) => void,
  baseDir = dir
) {
  if (!fs.existsSync(dir)) return;
  for (let filename of fs.readdirSync(dir)) {
    let file = path.resolve(dir, filename);
    let stat = fs.statSync(file);
    if (stat.isDirectory()) {
      defaultVisitFiles(file, visitor, baseDir);
    } else if (stat.isFile()) {
      visitor(path.relative(baseDir, file));
    }
  }
}

export function flatRoutes(
  routeDir: string,
  defineRoutes: any,
  options: FlatRouteOptions = {}
) {
  const fullOptions = { ...defaultOptions, ...options, routeDir, defineRoutes };
  const appDir = fullOptions.appDir ?? defaultOptions.appDir;
  const ignoredFilePatterns = fullOptions.ignoredRouteFiles ?? [];

  let routeMap = new Map<string, RouteInfo>();
  let nameMap = new Map<string, RouteInfo>();
  let routeDirs = Array.isArray(fullOptions.routeDir)
    ? fullOptions.routeDir
    : [fullOptions.routeDir ?? "routes"];

  const routeRegex = getRouteRegex(
    fullOptions.routeRegex ?? defaultOptions.routeRegex,
    fullOptions.nestedDirectoryChar ?? defaultOptions.nestedDirectoryChar
  );

  for (let dir of routeDirs) {
    defaultVisitFiles(path.join(appDir, dir), (file) => {
      if (
        ignoredFilePatterns.some((pattern) =>
          minimatch(file, pattern, { dot: true })
        )
      ) {
        return;
      }
      if (isRouteModuleFile(file, routeRegex)) {
        let routeInfo = getRouteInfo(dir, file, fullOptions);
        routeMap.set(routeInfo.id, routeInfo);
        nameMap.set(routeInfo.name, routeInfo);
      }
    });
  }

  routeMap.forEach((routeInfo) => {
    routeInfo.parentId = findParentRouteId(routeInfo, nameMap) ?? "root";
  });

  function defineNestedRoutes(defineRoute: any, parentId?: string) {
    let childRoutes = Array.from(routeMap.values()).filter(
      (r) => r.parentId === (parentId ?? "root")
    );
    for (let childRoute of childRoutes) {
      if (childRoute.index) {
        defineRoute(undefined, childRoute.file, { index: true });
      } else {
        defineRoute(childRoute.path, childRoute.file, () => {
          defineNestedRoutes(defineRoute, childRoute.id);
        });
      }
    }
  }

  return defineRoutes(defineNestedRoutes);
}

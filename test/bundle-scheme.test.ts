import * as path from "path";
import { BundleScheme } from "../src/utils/bundle-scheme";

describe("bundle-scheme", function () {
  let bundleScheme;

  describe("{platform}.pages/page_{scope}_{view}", function () {
    const bundleFormat = "{platform}.pages",
      mergeFormat = "pages/{platform}/{view}/{view}",
      pageFormat = "page_{scope}_{view}";

    beforeAll(function () {
      bundleScheme = new BundleScheme({
        bundleFormat,
        pageFormat,
        mergeFormat,
      });
    });

    it("should return bundle url", function () {
      bundleScheme.platform = "desktop";
      bundleScheme.scope = "shop";
      bundleScheme.view = "index";
      expect(bundleScheme.bundle).toBe("desktop.pages/page_shop_index");
    });

    it("should return bundle path", function () {
      bundleScheme.platform = "desktop";
      bundleScheme.scope = "shop";
      bundleScheme.view = "index";
      expect(bundleScheme.path).toBe(
        path.resolve("desktop.pages", "page_shop_index")
      );
    });

    it("should return bundle path with base", function () {
      const bs = new BundleScheme({
        bundleFormat,
        pageFormat,
        basePath: "/project/root",
      });
      bs.platform = "desktop";
      bs.scope = "shop";
      bs.view = "index";
      expect(bs.path).toBe(
        path.resolve("/project/root", "desktop.pages", "page_shop_index")
      );
    });

    it("should return bundle name", function () {
      bundleScheme.platform = "desktop";
      bundleScheme.scope = "shop";
      bundleScheme.view = "index";
      expect(bundleScheme.name).toBe("page_shop_index");
    });

    it("should change name", function () {
      bundleScheme.platform = "desktop";
      bundleScheme.scope = "shop";
      bundleScheme.view = "index";
      bundleScheme.scope = "admin";
      bundleScheme.view = "documents";
      expect(bundleScheme.name).toBe("page_admin_documents");
    });

    it("should return file url", function () {
      bundleScheme.platform = "desktop";
      bundleScheme.scope = "shop";
      bundleScheme.view = "index";
      expect(bundleScheme.getFileUrl("js")).toBe(
        "/desktop.pages/page_shop_index/page_shop_index.js"
      );
      expect(bundleScheme.getFileUrl("js", "ru")).toBe(
        "/desktop.pages/page_shop_index/page_shop_index.ru.js"
      );
    });

    it("url should contain baseUrl", function () {
      const bs = new BundleScheme({
        bundleFormat,
        pageFormat,
        baseUrl: "http://abc.com",
      });
      bs.platform = "mobile";
      bs.scope = "auth";
      bs.view = "user";
      expect(bs.getFileUrl("js", "ru")).toBe(
        "http://abc.com/mobile.pages/page_auth_user/page_auth_user.ru.js"
      );
    });

    it("merge prop should contain path", () => {
      bundleScheme.platform = "desktop";
      bundleScheme.scope = "shop";
      bundleScheme.view = "index";
      expect(bundleScheme.merge).toBe("pages/desktop/index/index");
    });

    it("should return merge url", () => {
      bundleScheme.platform = "desktop";
      bundleScheme.scope = "shop";
      bundleScheme.view = "index";
      expect(bundleScheme.getFileUrl("css", null, true)).toBe(
        "/pages/desktop/index/index.css"
      );
      expect(bundleScheme.getFileUrl("js", "ru", true)).toBe(
        "/pages/desktop/index/index.ru.js"
      );
    });
  });

  describe("pages/{platform}/page_{scope}_{view}", function () {
    const bundleFormat = "pages/{platform}",
      pageFormat = "page_{scope}_{view}";
    beforeAll(function () {
      bundleScheme = new BundleScheme({ bundleFormat, pageFormat });
    });

    it("should return bundle url", function () {
      bundleScheme.platform = "desktop";
      bundleScheme.scope = "shop";
      bundleScheme.view = "index";
      expect(bundleScheme.bundleUrl).toBe("/pages/desktop/page_shop_index");
    });
  });
});

import * as path from "path";
import { BundleScheme } from "../src/utils/bundle-scheme";

describe("bundle-scheme", function () {
  let bundleScheme;

  describe("{platform}.pages/page_{scope}_{view}", function () {
    const scheme = "{platform}.pages",
      page = "page_{scope}_{view}";
    beforeAll(function () {
      bundleScheme = new BundleScheme(scheme, page);
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
      expect(bundleScheme.getFileUrl("js", "ru")).toBe(
        "desktop.pages/page_shop_index/page_shop_index.ru.js"
      );
    });

    it("static Root should have value", function () {
      const bs = new BundleScheme(scheme, page, "http://abc.com/");
      expect(bs.staticRoot).toBe("http://abc.com/");
    });
  });

  describe("pages/{platform}/page_{scope}_{view}", function () {
    const scheme = "pages/{platform}",
      page = "page_{scope}_{view}";
    beforeAll(function () {
      bundleScheme = new BundleScheme(scheme, page);
    });

    it("should return bundle url", function () {
      bundleScheme.platform = "desktop";
      bundleScheme.scope = "shop";
      bundleScheme.view = "index";
      expect(bundleScheme.baseUrl).toBe(
        "pages/desktop/page_shop_index/page_shop_index"
      );
    });
  });
});

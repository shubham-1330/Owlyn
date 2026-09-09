import { describe, expect, it } from "vitest";
import {
  catalogHref,
  clearFilters,
  isIndexable,
  parseCatalogParams,
  serializeCatalogParams,
  toggleListValue,
} from "./search-params";

describe("parseCatalogParams", () => {
  it("accepts repeated and comma-joined values, sorted and deduplicated", () => {
    const params = parseCatalogParams({ size: ["uk-9,uk-8", "uk-8"], color: "ink" });
    expect(params.size).toEqual(["uk-8", "uk-9"]);
    expect(params.color).toEqual(["ink"]);
  });

  it("drops invalid values instead of failing the whole parse", () => {
    const params = parseCatalogParams({
      size: "uk-8,<script>",
      gender: "men,cats",
      sort: "bogus",
      page: "-3",
      discount: "500",
      price: "abc",
    });
    expect(params.size).toEqual(["uk-8"]);
    expect(params.gender).toEqual(["men"]);
    expect(params.sort).toBe("featured");
    expect(params.page).toBe(1);
    expect(params.discount).toBeNull();
    expect(params.price).toBeNull();
  });

  it("parses price ranges in rupees to paise and fixes inverted bounds", () => {
    expect(parseCatalogParams({ price: "2000-6000" }).price).toEqual({ min: 200000, max: 600000 });
    expect(parseCatalogParams({ price: "6000-2000" }).price).toEqual({ min: 200000, max: 600000 });
    expect(parseCatalogParams({ price: "-1500" }).price).toEqual({ min: undefined, max: 150000 });
    expect(parseCatalogParams({ price: "999-" }).price).toEqual({ min: 99900, max: undefined });
  });

  it("reads stock=in as a boolean and clamps the page", () => {
    expect(parseCatalogParams({ stock: "in" }).inStock).toBe(true);
    expect(parseCatalogParams({ stock: "out" }).inStock).toBe(false);
    expect(parseCatalogParams({ page: "99999" }).page).toBe(500);
  });
});

describe("serializeCatalogParams", () => {
  it("round-trips to a canonical string and omits defaults", () => {
    const params = parseCatalogParams({
      color: ["ink", "bone"],
      size: "uk-9,uk-8",
      price: "2000-6000",
      sort: "price_asc",
      page: "2",
      stock: "in",
    });
    const qs = serializeCatalogParams(params);
    expect(qs).toBe(
      "size=uk-8%2Cuk-9&color=bone%2Cink&price=2000-6000&stock=in&sort=price_asc&page=2",
    );
    expect(parseCatalogParams(new URLSearchParams(qs))).toEqual(params);
  });

  it("builds hrefs that reset the page when filters change", () => {
    const params = parseCatalogParams({ page: "3", size: "uk-8" });
    expect(catalogHref("/collections/men", params)).toBe("/collections/men?size=uk-8");
    expect(catalogHref("/collections/men", params, { keepPage: true })).toBe(
      "/collections/men?size=uk-8&page=3",
    );
    expect(catalogHref("/collections/men", clearFilters(params))).toBe("/collections/men");
  });

  it("toggles list values", () => {
    const params = parseCatalogParams({ size: "uk-8" });
    expect(toggleListValue(params, "size", "uk-9").size).toEqual(["uk-8", "uk-9"]);
    expect(toggleListValue(params, "size", "uk-8").size).toEqual([]);
  });
});

describe("isIndexable", () => {
  it("indexes bare and single-facet pages only", () => {
    expect(isIndexable(parseCatalogParams({}))).toBe(true);
    expect(isIndexable(parseCatalogParams({ page: "2" }))).toBe(true);
    expect(isIndexable(parseCatalogParams({ color: "ink" }))).toBe(true);
    expect(isIndexable(parseCatalogParams({ color: "ink,bone" }))).toBe(false);
    expect(isIndexable(parseCatalogParams({ color: "ink", size: "uk-8" }))).toBe(false);
    expect(isIndexable(parseCatalogParams({ sort: "newest" }))).toBe(false);
    expect(isIndexable(parseCatalogParams({ price: "0-2000" }))).toBe(false);
    expect(isIndexable(parseCatalogParams({ q: "strider" }))).toBe(false);
  });
});

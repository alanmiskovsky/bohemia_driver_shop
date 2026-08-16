import { useState, useEffect } from 'react'
import wpApi from '../api/wordpress'

/**
 * Generic hook for fetching WordPress data
 */
export function useWordPress(fetchFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchFn()
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, deps)

  return { data, loading, error }
}

/**
 * Fetch all cars
 */
export function useCars(params = {}) {
  return useWordPress(() => wpApi.getCars(params), [JSON.stringify(params)])
}

/**
 * Fetch single car by slug
 */
export function useCar(slug) {
  return useWordPress(() => wpApi.getCar(slug), [slug])
}

/**
 * Fetch services
 */
export function useServices() {
  return useWordPress(() => wpApi.getServices(), [])
}

/**
 * Fetch branches
 */
export function useBranches() {
  return useWordPress(() => wpApi.getBranches(), [])
}

/**
 * Fetch posts
 */
export function usePosts(params = {}) {
  return useWordPress(() => wpApi.getPosts(params), [JSON.stringify(params)])
}

/**
 * Fetch single post by slug
 */
export function usePost(slug) {
  return useWordPress(() => wpApi.getPost(slug), [slug])
}

/**
 * Fetch page by slug
 */
export function usePage(slug) {
  return useWordPress(() => wpApi.getPage(slug), [slug])
}

/**
 * Fetch WooCommerce products
 */
export function useProducts(params = {}) {
  return useWordPress(() => wpApi.getProducts(params), [JSON.stringify(params)])
}

/**
 * Fetch single WooCommerce product by ID
 */
export function useProduct(id) {
  return useWordPress(() => wpApi.getProduct(id), [id])
}

/**
 * Fetch WooCommerce product categories
 */
export function useProductCategories() {
  return useWordPress(() => wpApi.getProductCategories(), [])
}

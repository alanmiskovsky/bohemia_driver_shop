/**
 * WordPress REST API client for headless CMS
 */

const API_BASE = import.meta.env.VITE_WP_API_URL || '/wp-json'

class WordPressAPI {
  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl
  }

  async fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Pages
  async getPages() {
    return this.fetch('/wp/v2/pages?_embed')
  }

  async getPage(slug) {
    const pages = await this.fetch(`/wp/v2/pages?slug=${slug}&_embed`)
    return pages[0] || null
  }

  // Posts (for blog/news)
  async getPosts(params = {}) {
    const query = new URLSearchParams({
      _embed: true,
      per_page: 10,
      ...params,
    })
    return this.fetch(`/wp/v2/posts?${query}`)
  }

  async getPost(slug) {
    const posts = await this.fetch(`/wp/v2/posts?slug=${slug}&_embed`)
    return posts[0] || null
  }

  // Custom Post Types (for cars, services, branches)
  async getCars(params = {}) {
    const query = new URLSearchParams({
      _embed: true,
      per_page: 20,
      ...params,
    })
    return this.fetch(`/wp/v2/cars?${query}`)
  }

  async getCar(slug) {
    const cars = await this.fetch(`/wp/v2/cars?slug=${slug}&_embed`)
    return cars[0] || null
  }

  async getServices() {
    return this.fetch('/wp/v2/services?_embed&per_page=100')
  }

  async getBranches() {
    return this.fetch('/wp/v2/branches?_embed')
  }

  // Media
  async getMedia(id) {
    return this.fetch(`/wp/v2/media/${id}`)
  }

  // Menus (requires WP REST API Menus plugin or custom endpoint)
  async getMenu(location) {
    return this.fetch(`/menus/v1/menus/${location}`)
  }

  // Site info
  async getSiteInfo() {
    return this.fetch('/wp/v2/settings')
  }

  // Custom ACF fields (requires ACF to REST API plugin)
  async getACFOptions() {
    return this.fetch('/acf/v3/options/options')
  }

  // Contact form submission
  async submitContactForm(data) {
    return this.fetch('/contact-form-7/v1/contact-forms/1/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Newsletter subscription
  async subscribeNewsletter(email) {
    return this.fetch('/bohemia/v1/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  // WooCommerce Store API — Products
  async getProducts(params = {}) {
    const query = new URLSearchParams({
      per_page: 20,
      ...params,
    })
    return this.fetch(`/wc/store/v1/products?${query}`)
  }

  async getProduct(id) {
    return this.fetch(`/wc/store/v1/products/${id}`)
  }

  // WooCommerce Store API — Product Categories
  async getProductCategories() {
    return this.fetch('/wc/store/v1/products/categories?hide_empty=false')
  }
}

export const wpApi = new WordPressAPI()
export default wpApi

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProductsClassic from './pages/ProductsClassic'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'

function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<ProductsClassic />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/about" element={<div className="pt-32 text-center">O nás (Již brzy)</div>} />
                <Route path="/contact" element={<div className="pt-32 text-center">Kontakt (Již brzy)</div>} />
                <Route path="*" element={<div className="pt-32 text-center">404 – Stránka nenalezena</div>} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  )
}

export default App

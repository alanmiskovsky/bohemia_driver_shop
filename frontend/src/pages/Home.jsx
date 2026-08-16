import Hero from '../components/Hero'
import TrustBadges from '../components/TrustBadges'
import FeaturedCategories from '../components/CarsPreview'
import FeaturedProducts from '../components/FeaturedProducts'
import Newsletter from '../components/Newsletter'
import useScrollReveal from '../hooks/useScrollReveal'

function Home() {
  useScrollReveal()

  return (
    <>
      <Hero />
      <TrustBadges />
      <FeaturedCategories />
      <FeaturedProducts />
      <Newsletter />
    </>
  )
}

export default Home

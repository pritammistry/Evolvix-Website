import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { AnalyticsTracker } from "./components/AnalyticsTracker";
import { ScrollToTop } from "./components/ScrollToTop";
import Home from "./pages/Home";
import About from "./pages/About";
import Portfolio from "./pages/Portfolio";
import Services from "./pages/Services";
import Ecosystem from "./pages/Ecosystem";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import CreativeLab from "./pages/CreativeLab";
import Demo from "./pages/Demo";
import Playground from "./pages/Playground";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import CheckoutResult from "./pages/CheckoutResult";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import { AuthProvider } from "./hooks/useAuth";

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const routes = (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<Services />} />
      <Route path="/ecosystem" element={<Ecosystem />} />
      <Route path="/portfolio" element={<Portfolio />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/learning-growth" element={<Shop />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/products/:slug" element={<ProductDetail />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/music" element={<CreativeLab />} />
      <Route path="/creative-lab" element={<CreativeLab />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogDetail />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/terms" element={<Legal type="terms" />} />
      <Route path="/privacy" element={<Legal type="privacy" />} />
      <Route path="/refund" element={<Legal type="refund" />} />
      <Route path="/checkout/success" element={<CheckoutResult />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );

  if (isAdmin) return routes;
  return <Layout><div key={location.pathname} className="page-transition-wrap">{routes}</div></Layout>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AnalyticsTracker />
        <AppRoutes />
        <Toaster richColors position="bottom-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

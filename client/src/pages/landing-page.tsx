import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Users, Shield, Globe2, Briefcase, Book, Stethoscope, Calculator, HardHat, Code } from "lucide-react";
import { motion } from "framer-motion";
import { TourGuide } from "@/components/TourGuide";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const isFirstVisit = !localStorage.getItem('tourCompleted');

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  // If user is logged in, redirect to dashboard
  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const services = [
    { icon: Stethoscope, title: "Medical Professionals", description: "Healthcare workers and medical specialists" },
    { icon: HardHat, title: "Engineering", description: "Civil, mechanical, and electrical engineers" },
    { icon: Calculator, title: "Economics & Finance", description: "Financial analysts and economists" },
    { icon: Book, title: "Education", description: "Teachers and academic professionals" },
    { icon: Briefcase, title: "Business Management", description: "Business administrators and managers" },
    { icon: Code, title: "Information Technology", description: "IT professionals and software developers" },
    { icon: Shield, title: "Research & Development", description: "Scientists and researchers" },
    { icon: Users, title: "Human Resources", description: "HR professionals and consultants" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-yellow-300 to-green-200">
      <TourGuide isFirstVisit={isFirstVisit} />

      <nav className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-green-700 cursor-pointer hover:text-yellow-600 transition-colors">KEYDSO</h1>
          </Link>
          <Button 
            onClick={() => setLocation("/auth")}
            className="login-button bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600"
          >
            Login
          </Button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="hero-section py-20 bg-gradient-to-br from-green-50 via-yellow-50 to-green-50">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-green-600 to-yellow-500 bg-clip-text text-transparent leading-tight">
                Streamlined Appointment Management
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Efficiently manage appointments and work permits globally with our comprehensive business solution
              </p>
              <Button
                size="lg"
                onClick={() => setLocation("/auth")}
                className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600"
              >
                Get Started
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Services Section */}
        <section className="services-section py-20 bg-gradient-to-br from-yellow-100 via-yellow-50 to-white">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-center mb-4">Professional Services</h2>
            <p className="text-center text-gray-600 mb-12">Supporting diverse professional fields across industries</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-lg border bg-white shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <service.icon className="h-12 w-12 text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section py-20 bg-gradient-to-br from-green-200 via-green-100 to-green-50">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: CalendarCheck,
                  title: "Smart Scheduling",
                  description: "Efficiently manage appointments with our intuitive system"
                },
                {
                  icon: Users,
                  title: "Team Collaboration",
                  description: "Seamless coordination between team members"
                },
                {
                  icon: Shield,
                  title: "Secure Processing",
                  description: "Top-tier security for your sensitive data"
                },
                {
                  icon: Globe2,
                  title: "Global Coverage",
                  description: "Complete coverage across all countries"
                }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-lg border bg-white shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <feature.icon className="h-12 w-12 text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Team Section */}
        <section className="team-section py-20 bg-gradient-to-br from-purple-100 via-pink-50 to-white">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl mx-auto text-center"
            >
              <h2 className="text-3xl font-bold mb-6">Our Team</h2>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-green-700 mb-2">Eng. Abdulkhaliq Abdullahi Mohamed</h3>
                <p className="text-xl text-gray-600 mb-4">Founder and CEO</p>
                <p className="text-gray-600 italic">
                  "Our mission is to streamline and simplify the professional appointment management process globally, ensuring efficiency and excellence in service delivery."
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <p className="text-gray-600">Made for you with ❤</p>
          </div>
          <p className="text-gray-600">&copy; 2025 KEYDSO. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
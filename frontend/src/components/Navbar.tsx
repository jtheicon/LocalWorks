import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import LoginModal from "./LoginModal";
import SignUpModal from "./SignUpModal";
import logo from "@/assets/logo.avif";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Find Workers", href: "/find-workers" },
    { name: "Find Jobs", href: "/find-jobs" },
    { name: "How It Works", href: "/#how-it-works" },
  ];

  const handleSwitchToSignUp = () => {
    setLoginOpen(false);
    setSignUpOpen(true);
  };

  const handleSwitchToLogin = () => {
    setSignUpOpen(false);
    setLoginOpen(true);
  };

  return (
    <>
      <nav className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center p-1 overflow-hidden">
                <img src={logo} alt="LocalWorks" className="h-full w-full object-cover rounded-full" />
              </div>
              <span className="text-xl font-bold text-foreground">LocalWorks</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => setLoginOpen(true)}>
                Login
              </Button>
              <Button onClick={() => setSignUpOpen(true)}>
                Sign Up
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <Button 
                    variant="ghost" 
                    className="justify-start" 
                    onClick={() => {
                      setIsOpen(false);
                      setLoginOpen(true);
                    }}
                  >
                    Login
                  </Button>
                  <Button 
                    className="justify-start"
                    onClick={() => {
                      setIsOpen(false);
                      setSignUpOpen(true);
                    }}
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Modals */}
      <LoginModal 
        open={loginOpen} 
        onOpenChange={setLoginOpen} 
        onSwitchToSignUp={handleSwitchToSignUp}
      />
      <SignUpModal 
        open={signUpOpen} 
        onOpenChange={setSignUpOpen} 
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  );
};

export default Navbar;

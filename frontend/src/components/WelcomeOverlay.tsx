import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Layers, Grid3x3, Play, ArrowRight } from 'lucide-react';
import logo from '../assets/livestockway-logo.svg';

interface WelcomeOverlayProps {
  onClose: () => void;
  onStartPrototype?: () => void;
  onViewShowcase?: () => void;
}

export function WelcomeOverlay({ onClose, onStartPrototype, onViewShowcase }: WelcomeOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setShow(true), 100);
  }, []);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  return (
    <div 
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-300 ${
        show ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleClose}
    >
      <Card 
        className={`max-w-2xl w-full transition-all duration-300 ${
          show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative pb-4">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <div className="text-center mb-4">
            <img 
              src={logo} 
              alt="LivestockWay" 
              className="h-12 mx-auto mb-3"
            />
            <CardTitle className="text-2xl text-[#172039]">
              Welcome to LivestockWay
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Complete Interactive Prototype
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Two Modes */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Prototype Mode */}
            <button
              onClick={() => {
                handleClose();
                if (onStartPrototype) onStartPrototype();
              }}
              className="p-6 border-2 border-[#29CA8D] rounded-xl hover:shadow-lg transition-all text-left group"
            >
              <div className="w-12 h-12 bg-[#29CA8D]/10 rounded-lg flex items-center justify-center mb-4">
                <Play className="w-6 h-6 text-[#29CA8D]" />
              </div>
              <h3 className="text-lg text-gray-900 mb-2 group-hover:text-[#29CA8D] transition-colors">
                Interactive Prototype
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Experience the full app flow from splash screen to dashboard
              </p>
              <div className="flex items-center text-sm text-[#29CA8D]">
                Start Journey <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </button>

            {/* Showcase Mode */}
            <button
              onClick={() => {
                handleClose();
                if (onViewShowcase) onViewShowcase();
              }}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-[#29CA8D] hover:shadow-lg transition-all text-left group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#29CA8D]/10">
                <Grid3x3 className="w-6 h-6 text-gray-600 group-hover:text-[#29CA8D]" />
              </div>
              <h3 className="text-lg text-gray-900 mb-2 group-hover:text-[#29CA8D] transition-colors">
                Screen Showcase
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                View all 15 screens in a Figma-style design board
              </p>
              <div className="flex items-center text-sm text-gray-600 group-hover:text-[#29CA8D]">
                Browse Screens <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </button>
          </div>

          {/* Quick Tips */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm text-gray-900 mb-3">💡 Quick Tips:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[#29CA8D] mt-0.5">•</span>
                <span><strong>Login:</strong> Use any email/password to sign in</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#29CA8D] mt-0.5">•</span>
                <span><strong>OTP Code:</strong> Enter 123456 for verification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#29CA8D] mt-0.5">•</span>
                <span><strong>Toggle Modes:</strong> Use buttons in top-right corner</span>
              </li>
            </ul>
          </div>

          {/* Roles */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#29CA8D]/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">🚚</span>
              </div>
              <p className="text-xs text-gray-600">Driver</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#F97316]/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">📦</span>
              </div>
              <p className="text-xs text-gray-600">Shipper</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#172039]/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">🏢</span>
              </div>
              <p className="text-xs text-gray-600">Hauler</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">👑</span>
              </div>
              <p className="text-xs text-gray-600">Admin</p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                handleClose();
                if (onStartPrototype) onStartPrototype();
              }}
              className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Exploring
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

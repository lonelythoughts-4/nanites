import React from 'react';
    import { Crown, Star, Diamond } from 'lucide-react';

    interface TierBadgeProps {
      tier: string;
      className?: string;
    }

    const TierBadge: React.FC<TierBadgeProps> = ({ tier, className = '' }) => {
      const getTierConfig = (tier: string) => {
        switch (tier) {
          case 'TIER_1':
          case 'TIER_2':
            return {
              color: 'bg-gray-100 text-gray-800 border-gray-300',
              icon: Star,
              label: tier.replace('_', ' ')
            };
          case 'TIER_3':
          case 'TIER_4':
            return {
              color: 'bg-blue-100 text-blue-800 border-blue-300',
              icon: Star,
              label: tier.replace('_', ' ')
            };
          case 'TIER_5':
          case 'TIER_6':
            return {
              color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
              icon: Crown,
              label: tier.replace('_', ' ')
            };
          case 'TIER_7':
            return {
              color: 'bg-purple-100 text-purple-800 border-purple-300',
              icon: Diamond,
              label: 'TIER 7'
            };
          default:
            return {
              color: 'bg-gray-100 text-gray-800 border-gray-300',
              icon: Star,
              label: 'TIER 1'
            };
        }
      };

      const config = getTierConfig(tier);
      const Icon = config.icon;

      return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color} ${className}`}>
          <Icon className="h-4 w-4 mr-1" />
          {config.label}
        </span>
      );
    };

    export default TierBadge;
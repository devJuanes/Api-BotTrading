export type RiskProfile = 'SAFE' | 'BALANCED' | 'AGGRESSIVE';

export interface RiskConfig {
    minSignalStrength: number;
    slMultiplier: number;
    tpMultiplier: number;
}

export class RiskManager {
    static getProfileConfig(profile: RiskProfile): RiskConfig {
        switch (profile) {
            case 'SAFE':
                return { minSignalStrength: 75, slMultiplier: 1.2, tpMultiplier: 2.0 };
            case 'AGGRESSIVE':
                return { minSignalStrength: 55, slMultiplier: 2.0, tpMultiplier: 4.0 };
            case 'BALANCED':
            default:
                return { minSignalStrength: 65, slMultiplier: 1.6, tpMultiplier: 2.8 };
        }
    }
}

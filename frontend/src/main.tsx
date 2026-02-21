import { Buffer } from 'buffer'
window.Buffer = Buffer
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import MegaCanvasApp from './MegaCanvasApp.tsx'
import './CyberAesthetic.css'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <PrivyProvider
            appId={import.meta.env.VITE_PRIVY_APP_ID || 'placeholder_app_id'}
            config={{
                loginMethods: ['email', 'wallet'],
                appearance: {
                    theme: 'dark',
                    accentColor: '#00FF41',
                    logo: 'https://i.imgur.com/your-logo.png',
                },
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'all-users',
                    },
                    showWalletUIs: false
                },
                supportedChains: [{
                    id: 6343,
                    name: 'MegaETH Testnet',
                    network: 'megaeth-testnet',
                    nativeCurrency: {
                        name: 'Ether',
                        symbol: 'ETH',
                        decimals: 18,
                    },
                    rpcUrls: {
                        default: {
                            http: ['https://carrot.megaeth.com/rpc'],
                        },
                        public: {
                            http: ['https://carrot.megaeth.com/rpc'],
                        },
                    },
                    blockExplorers: {
                        default: {
                            name: 'MegaETH Explorer',
                            url: 'https://carrot.megaeth.com',
                        },
                    },
                    testnet: true,
                } as any],
                defaultChain: {
                    id: 6343,
                    name: 'MegaETH Testnet',
                    network: 'megaeth-testnet',
                    nativeCurrency: {
                        name: 'Ether',
                        symbol: 'ETH',
                        decimals: 18,
                    },
                    rpcUrls: {
                        default: {
                            http: ['https://carrot.megaeth.com/rpc'],
                        },
                        public: {
                            http: ['https://carrot.megaeth.com/rpc'],
                        },
                    },
                    blockExplorers: {
                        default: {
                            name: 'MegaETH Explorer',
                            url: 'https://carrot.megaeth.com',
                        },
                    },
                    testnet: true,
                } as any
            }}
        >
            <MegaCanvasApp />
        </PrivyProvider>
    </StrictMode>,
)

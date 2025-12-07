import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function TestApp() {
    return (
        <div style={{ background: 'white', minHeight: '100vh', padding: '20px' }}>
            <h1 style={{ color: 'black', fontSize: '32px' }}>Test Page</h1>
            <p style={{ color: 'black' }}>If you can see this, React is working!</p>
            <button
                onClick={() => alert('Button clicked!')}
                style={{
                    background: 'blue',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                Click Me
            </button>
        </div>
    )
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <TestApp />
    </StrictMode>,
)

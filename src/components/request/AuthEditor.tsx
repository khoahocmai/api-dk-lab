import { useState } from 'react'
import { Eye, EyeOff, Key, Lock, ShieldCheck, User } from 'lucide-react'
import type { ApiKeyAddTo, AuthConfig, AuthType, EnvironmentItem } from '../../types'
import { TemplateInput } from '../common/TemplateInput'

interface AuthEditorProps {
  auth: AuthConfig
  onChange: (auth: AuthConfig) => void
  environment?: EnvironmentItem | null
}

export function AuthEditor({ auth, onChange, environment }: AuthEditorProps) {
  const [showBearerToken, setShowBearerToken] = useState(true)
  const [showBasicPassword, setShowBasicPassword] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const handleTypeChange = (type: AuthType) => {
    onChange({ ...auth, type })
  }

  return (
    <div className="auth-editor stack" style={{ padding: '10px 12px', gap: 12 }}>
      {/* 1. AUTH TYPE SELECTOR */}
      <div className="row wrap" style={{ gap: 10, alignItems: 'center' }}>
        <span className="caps">Auth Type:</span>
        <select
          className="select select-sm"
          value={auth.type}
          onChange={(e) => handleTypeChange(e.target.value as AuthType)}
          style={{ maxWidth: 180, fontWeight: 700 }}
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apiKey">API Key</option>
        </select>
      </div>

      {/* 2. NO AUTH */}
      {auth.type === 'none' && (
        <div className="response-empty" style={{ minHeight: 140 }}>
          This request does not use any authorization.
        </div>
      )}

      {/* 3. BEARER TOKEN */}
      {auth.type === 'bearer' && (
        <div className="stack" style={{ maxWidth: 520, gap: 8, marginTop: 4 }}>
          <div className="caps">Token</div>
          <TemplateInput
            size="default"
            type={showBearerToken ? 'text' : 'password'}
            startIcon={<Lock size={14} className="text-gray-400 pointer-events-none" />}
            endAction={
              <button
                type="button"
                onClick={() => setShowBearerToken(!showBearerToken)}
                title={showBearerToken ? 'Hide Token' : 'Show Token'}
                aria-label={showBearerToken ? 'Hide Token' : 'Show Token'}
              >
                {showBearerToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
            value={auth.bearerToken || ''}
            onChange={(val) => onChange({ ...auth, bearerToken: val })}
            placeholder="Enter Token or {{variable}}..."
            environment={environment}
            aria-label="Bearer Token"
          />

          <div className="auth-banner">
            <ShieldCheck className="auth-banner-icon" size={14} />
            <span>
              <strong className="auth-banner-highlight">Header Authorization:</strong> Bearer &lt;token&gt; is automatically injected on send.
            </span>
          </div>
        </div>
      )}

      {/* 4. BASIC AUTH */}
      {auth.type === 'basic' && (
        <div className="stack" style={{ maxWidth: 520, gap: 10, marginTop: 4 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Username</div>
            <TemplateInput
              size="default"
              startIcon={<User size={14} className="text-gray-400 pointer-events-none" />}
              value={auth.basicUsername || ''}
              onChange={(val) => onChange({ ...auth, basicUsername: val })}
              placeholder="Username (e.g. admin or {{user}})"
              environment={environment}
              aria-label="Basic Auth Username"
            />
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Password</div>
            <TemplateInput
              size="default"
              type={showBasicPassword ? 'text' : 'password'}
              startIcon={<Lock size={14} className="text-gray-400 pointer-events-none" />}
              endAction={
                <button
                  type="button"
                  onClick={() => setShowBasicPassword(!showBasicPassword)}
                  title={showBasicPassword ? 'Hide Password' : 'Show Password'}
                  aria-label={showBasicPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showBasicPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
              value={auth.basicPassword || ''}
              onChange={(val) => onChange({ ...auth, basicPassword: val })}
              placeholder="Password (e.g. {{password}})"
              environment={environment}
              aria-label="Basic Auth Password"
            />
          </div>

          <div className="auth-banner">
            <ShieldCheck className="auth-banner-icon" size={14} />
            <span>
              Credentials will be Base64-encoded and sent as <strong className="auth-banner-highlight">Authorization: Basic &lt;base64&gt;</strong>.
            </span>
          </div>
        </div>
      )}

      {/* 5. API KEY */}
      {auth.type === 'apiKey' && (
        <div className="stack" style={{ maxWidth: 520, gap: 10, marginTop: 4 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Key Name</div>
            <TemplateInput
              size="default"
              startIcon={<Key size={14} className="text-gray-400 pointer-events-none" />}
              value={auth.apiKeyName || ''}
              onChange={(val) => onChange({ ...auth, apiKeyName: val })}
              placeholder="e.g. X-API-Key or api_key"
              environment={environment}
              aria-label="API Key Name"
            />
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Key Value</div>
            <TemplateInput
              size="default"
              type={showApiKey ? 'text' : 'password'}
              startIcon={<Lock size={14} className="text-gray-400 pointer-events-none" />}
              endAction={
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? 'Hide Key Value' : 'Show Key Value'}
                  aria-label={showApiKey ? 'Hide Key Value' : 'Show Key Value'}
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
              value={auth.apiKeyValue || ''}
              onChange={(val) => onChange({ ...auth, apiKeyValue: val })}
              placeholder="e.g. {{apiKey}} or secret_key_123"
              environment={environment}
              aria-label="API Key Value"
            />
          </div>

          <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
            <span className="caps">Add To:</span>
            <div className="segmented">
              <button
                type="button"
                className={`segment-button ${auth.apiKeyAddTo === 'header' ? 'is-active' : ''}`}
                onClick={() => onChange({ ...auth, apiKeyAddTo: 'header' as ApiKeyAddTo })}
              >
                Header
              </button>
              <button
                type="button"
                className={`segment-button ${auth.apiKeyAddTo === 'query' ? 'is-active' : ''}`}
                onClick={() => onChange({ ...auth, apiKeyAddTo: 'query' as ApiKeyAddTo })}
              >
                Query Params
              </button>
            </div>
          </div>

          <div className="auth-banner">
            <ShieldCheck className="auth-banner-icon" size={14} />
            <span>
              The API Key will be attached as a <strong className="auth-banner-highlight">{auth.apiKeyAddTo === 'header' ? 'Request Header' : 'Query Parameter'}</strong>.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

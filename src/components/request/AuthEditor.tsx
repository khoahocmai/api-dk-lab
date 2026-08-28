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
  const [showRawBearerToken, setShowRawBearerToken] = useState(false)
  const [showRawBasicPassword, setShowRawBasicPassword] = useState(false)
  const [showRawApiKey, setShowRawApiKey] = useState(false)

  const isBearerTemplateVar = /\{\{.+?\}\}/.test(auth.bearerToken || '')
  const isBasicPasswordTemplateVar = /\{\{.+?\}\}/.test(auth.basicPassword || '')
  const isApiKeyTemplateVar = /\{\{.+?\}\}/.test(auth.apiKeyValue || '')

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
            type={isBearerTemplateVar || showRawBearerToken ? 'text' : 'password'}
            startIcon={<Lock size={13} className="pointer-events-none" />}
            endAction={
              !isBearerTemplateVar ? (
                <button
                  type="button"
                  onClick={() => setShowRawBearerToken(!showRawBearerToken)}
                  title={showRawBearerToken ? 'Hide Token' : 'Show Token'}
                  aria-label={showRawBearerToken ? 'Hide Token' : 'Show Token'}
                >
                  {showRawBearerToken ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              ) : undefined
            }
            value={auth.bearerToken || ''}
            onChange={(val) => onChange({ ...auth, bearerToken: val })}
            placeholder="Enter Bearer Token or {{Token}}..."
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
              startIcon={<User size={13} className="pointer-events-none" />}
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
              type={isBasicPasswordTemplateVar || showRawBasicPassword ? 'text' : 'password'}
              startIcon={<Lock size={13} className="pointer-events-none" />}
              endAction={
                !isBasicPasswordTemplateVar ? (
                  <button
                    type="button"
                    onClick={() => setShowRawBasicPassword(!showRawBasicPassword)}
                    title={showRawBasicPassword ? 'Hide Password' : 'Show Password'}
                    aria-label={showRawBasicPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showRawBasicPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                ) : undefined
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
              startIcon={<Key size={13} className="pointer-events-none" />}
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
              type={isApiKeyTemplateVar || showRawApiKey ? 'text' : 'password'}
              startIcon={<Lock size={13} className="pointer-events-none" />}
              endAction={
                !isApiKeyTemplateVar ? (
                  <button
                    type="button"
                    onClick={() => setShowRawApiKey(!showRawApiKey)}
                    title={showRawApiKey ? 'Hide Key Value' : 'Show Key Value'}
                    aria-label={showRawApiKey ? 'Hide Key Value' : 'Show Key Value'}
                  >
                    {showRawApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                ) : undefined
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

import { Key, Lock, Shield, User } from 'lucide-react'
import type { ApiKeyAddTo, AuthConfig, AuthType } from '../../types'

interface AuthEditorProps {
  auth: AuthConfig
  onChange: (auth: AuthConfig) => void
}

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const handleTypeChange = (type: AuthType) => {
    onChange({ ...auth, type })
  }

  return (
    <div className="auth-editor stack" style={{ padding: '10px 12px', gap: 12 }}>
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

      {auth.type === 'none' && (
        <div className="response-empty" style={{ minHeight: 140 }}>
          This request does not use any authorization.
        </div>
      )}

      {auth.type === 'bearer' && (
        <div className="stack" style={{ maxWidth: 480, gap: 8, marginTop: 4 }}>
          <div className="caps">Token</div>
          <div className="row" style={{ position: 'relative' }}>
            <Lock size={13} style={{ position: 'absolute', left: 8, color: 'var(--text-dim)' }} />
            <input
              className="input input-sm"
              type="text"
              value={auth.bearerToken}
              onChange={(e) => onChange({ ...auth, bearerToken: e.target.value })}
              placeholder="e.g. {{token}} or eyJhbGciOi..."
              style={{ paddingLeft: 28, fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <div className="banner banner-success" style={{ fontSize: 11, padding: '6px 8px' }}>
            <Shield size={13} />
            <span>Header <code>Authorization: Bearer &lt;token&gt;</code> is automatically injected on send.</span>
          </div>
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="stack" style={{ maxWidth: 480, gap: 8, marginTop: 4 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Username</div>
            <div className="row" style={{ position: 'relative' }}>
              <User size={13} style={{ position: 'absolute', left: 8, color: 'var(--text-dim)' }} />
              <input
                className="input input-sm"
                value={auth.basicUsername}
                onChange={(e) => onChange({ ...auth, basicUsername: e.target.value })}
                placeholder="Username (e.g. admin or {{user}})"
                style={{ paddingLeft: 28 }}
              />
            </div>
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Password</div>
            <div className="row" style={{ position: 'relative' }}>
              <Lock size={13} style={{ position: 'absolute', left: 8, color: 'var(--text-dim)' }} />
              <input
                className="input input-sm"
                type="password"
                value={auth.basicPassword}
                onChange={(e) => onChange({ ...auth, basicPassword: e.target.value })}
                placeholder="Password (e.g. {{password}})"
                style={{ paddingLeft: 28 }}
              />
            </div>
          </div>

          <div className="banner banner-success" style={{ fontSize: 11, padding: '6px 8px' }}>
            <Shield size={13} />
            <span>Credentials will be Base64-encoded and sent as <code>Authorization: Basic &lt;base64&gt;</code>.</span>
          </div>
        </div>
      )}

      {auth.type === 'apiKey' && (
        <div className="stack" style={{ maxWidth: 480, gap: 8, marginTop: 4 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Key Name</div>
            <div className="row" style={{ position: 'relative' }}>
              <Key size={13} style={{ position: 'absolute', left: 8, color: 'var(--text-dim)' }} />
              <input
                className="input input-sm"
                value={auth.apiKeyName}
                onChange={(e) => onChange({ ...auth, apiKeyName: e.target.value })}
                placeholder="e.g. X-API-Key or api_key"
                style={{ paddingLeft: 28 }}
              />
            </div>
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Key Value</div>
            <input
              className="input input-sm"
              value={auth.apiKeyValue}
              onChange={(e) => onChange({ ...auth, apiKeyValue: e.target.value })}
              placeholder="e.g. {{apiKey}} or secret_key_123"
              style={{ fontFamily: 'var(--font-mono)' }}
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

          <div className="banner banner-success" style={{ fontSize: 11, padding: '6px 8px' }}>
            <Shield size={13} />
            <span>
              The API Key will be attached as a{' '}
              {auth.apiKeyAddTo === 'header' ? 'Request Header' : 'Query Parameter'}.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

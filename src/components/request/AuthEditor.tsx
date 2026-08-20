import { Key, Lock, Shield, User } from 'lucide-react'
import type { ApiKeyAddTo, AuthConfig, AuthType, EnvironmentItem } from '../../types'
import { TemplateInput } from '../common/TemplateInput'

interface AuthEditorProps {
  auth: AuthConfig
  onChange: (auth: AuthConfig) => void
  environment?: EnvironmentItem | null
}

export function AuthEditor({ auth, onChange, environment }: AuthEditorProps) {
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
          <TemplateInput
            size="sm"
            startIcon={<Lock size={13} />}
            value={auth.bearerToken}
            onChange={(val) => onChange({ ...auth, bearerToken: val })}
            placeholder="e.g. {{token}} or Bearer {{token}}"
            environment={environment}
            aria-label="Bearer Token"
          />
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
            <TemplateInput
              size="sm"
              startIcon={<User size={13} />}
              value={auth.basicUsername}
              onChange={(val) => onChange({ ...auth, basicUsername: val })}
              placeholder="Username (e.g. admin or {{user}})"
              environment={environment}
              aria-label="Basic Auth Username"
            />
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Password</div>
            <TemplateInput
              size="sm"
              type="password"
              startIcon={<Lock size={13} />}
              value={auth.basicPassword}
              onChange={(val) => onChange({ ...auth, basicPassword: val })}
              placeholder="Password (e.g. {{password}})"
              environment={environment}
              aria-label="Basic Auth Password"
            />
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
            <TemplateInput
              size="sm"
              startIcon={<Key size={13} />}
              value={auth.apiKeyName}
              onChange={(val) => onChange({ ...auth, apiKeyName: val })}
              placeholder="e.g. X-API-Key or api_key"
              environment={environment}
              aria-label="API Key Name"
            />
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <div className="caps">Key Value</div>
            <TemplateInput
              size="sm"
              value={auth.apiKeyValue}
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


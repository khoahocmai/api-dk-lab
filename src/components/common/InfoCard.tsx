import { type ReactNode } from 'react'

export function InfoCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="info-card">
      <div className="info-card-title">
        {icon}
        {title}
      </div>
      <div className="info-card-description">{description}</div>
    </div>
  )
}

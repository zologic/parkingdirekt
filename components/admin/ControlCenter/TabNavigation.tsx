import React from 'react'

interface Tab {
  id: string
  name: string
  icon: React.ComponentType<any>
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  isMobile?: boolean
}

export default function TabNavigation({ tabs, activeTab, onTabChange, isMobile = false }: TabNavigationProps) {
  const baseClasses = isMobile
    ? 'flex items-center px-3 py-2 text-sm font-medium rounded-md'
    : 'group flex items-center px-2 py-2 text-sm font-medium rounded-md'

  const getTabClasses = (tabId: string) => {
    const isActive = tabId === activeTab
    if (isActive) {
      return `${baseClasses} bg-primary-100 text-primary-900`
    }
    return `${baseClasses} text-gray-600 hover:bg-gray-50 hover:text-gray-900`
  }

  const iconClasses = isMobile
    ? 'mr-3 h-5 w-5 flex-shrink-0'
    : 'mr-3 h-5 w-5 flex-shrink-0'

  return (
    <nav className="space-y-1">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={getTabClasses(tab.id)}
          >
            <Icon
              className={`${iconClasses} ${
                activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}
              aria-hidden="true"
            />
            {tab.name}
          </button>
        )
      })}
    </nav>
  )
}
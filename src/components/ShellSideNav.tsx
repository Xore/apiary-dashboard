import { useState } from 'react'
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu'
import { Divider } from '@astryxdesign/core/Divider'
import { Icon } from '@astryxdesign/core/Icon'
import type { IconType } from '@astryxdesign/core/Icon'
import { MoreMenu } from '@astryxdesign/core/MoreMenu'
import { NavIcon } from '@astryxdesign/core/NavIcon'
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav'
import { Stack, VStack } from '@astryxdesign/core/Stack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import type { StatusDotVariant } from '@astryxdesign/core/StatusDot'
import {
  BookOpenIcon,
  BuildingOffice2Icon,
  CodeBracketIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  UserCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from '@tanstack/react-router'

type Conversation = {
  label: string
  status: StatusDotVariant
  statusLabel: string
}

type Workspace = {
  name: string
  icon: IconType
  chats: Conversation[]
}

const WORKSPACES: Workspace[] = [
  {
    name: 'Personal',
    icon: UserIcon,
    chats: [
      {
        label: 'Weekend trip planning',
        status: 'success',
        statusLabel: 'Active',
      },
      {
        label: 'Recipe ideas for the week',
        status: 'neutral',
        statusLabel: 'Idle',
      },
      {
        label: 'Book recommendations',
        status: 'warning',
        statusLabel: 'Needs review',
      },
      { label: 'Home workout plan', status: 'neutral', statusLabel: 'Idle' },
    ],
  },
  {
    name: 'Acme Corp',
    icon: BuildingOffice2Icon,
    chats: [
      {
        label: 'Q3 roadmap draft',
        status: 'accent',
        statusLabel: 'In progress',
      },
      {
        label: 'Customer onboarding flow',
        status: 'success',
        statusLabel: 'Active',
      },
      {
        label: 'Pricing strategy review',
        status: 'warning',
        statusLabel: 'Needs review',
      },
      { label: 'Standup summary', status: 'neutral', statusLabel: 'Idle' },
    ],
  },
  {
    name: 'Open Source',
    icon: CodeBracketIcon,
    chats: [
      {
        label: 'StyleX migration notes',
        status: 'accent',
        statusLabel: 'In progress',
      },
      {
        label: 'Skeleton loading states',
        status: 'success',
        statusLabel: 'Active',
      },
      { label: 'Accessibility audit', status: 'error', statusLabel: 'Blocked' },
      { label: 'Release notes v4.0', status: 'neutral', statusLabel: 'Idle' },
    ],
  },
]

const SELECTED_CHAT = 'StyleX migration notes'

type ShellNavItemProps = {
  label: string
  icon: IconType
  href?: string
  onClick?: () => void
}

function ShellNavItem({ label, icon, href, onClick }: ShellNavItemProps) {
  return <SideNavItem label={label} icon={icon} href={href} onClick={onClick} />
}

function ConversationNavItem({ label, status, statusLabel }: Conversation) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const showMenu = isHovered || isFocused || isMenuOpen

  return (
    <Stack
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsFocused(false)
        }
      }}
    >
      <SideNavItem
        label={label}
        onClick={() => {}}
        isSelected={label === SELECTED_CHAT}
        actions={
          showMenu ? (
            <MoreMenu
              size="sm"
              label="Conversation options"
              onOpenChange={setIsMenuOpen}
              items={[
                { label: 'Pin', onClick: () => {} },
                { label: 'Rename', onClick: () => {} },
                { label: 'Archive', onClick: () => {} },
                { label: 'Delete', onClick: () => {} },
              ]}
            />
          ) : undefined
        }
        endContent={
          showMenu ? undefined : (
            <StatusDot variant={status} label={statusLabel} />
          )
        }
      />
    </Stack>
  )
}

function WorkspaceNavItem({ name, icon, chats }: Workspace) {
  return (
    <SideNavItem
      label={name}
      icon={icon}
      collapsible={{ defaultIsCollapsed: false }}
    >
      <VStack gap={0.5}>
        {chats.map((chat) => (
          <ConversationNavItem key={chat.label} {...chat} />
        ))}
      </VStack>
    </SideNavItem>
  )
}

function UserProfileMenu() {
  const navigate = useNavigate()

  return (
    <DropdownMenu
      placement="above"
      button={{
        label: 'Sarah Chen',
        icon: <Icon icon={UserCircleIcon} size="sm" />,
        variant: 'ghost',
        width: '100%',
      }}
    >
      <DropdownMenuItem
        label="Settings"
        icon={Cog6ToothIcon}
        onClick={() => void navigate({ to: '/settings' })}
      />
    </DropdownMenu>
  )
}

type ShellSideNavProps = {
  onOpenPalette: () => void
}

export function ShellSideNav({ onOpenPalette }: ShellSideNavProps) {
  return (
    <SideNav
      collapsible
      resizable={{ defaultWidth: 300, minWidth: 220, maxWidth: 420 }}
      header={
        <SideNavHeading
          heading="AI Assistant"
          icon={<NavIcon icon={<Icon icon={SparklesIcon} size="sm" />} />}
          headingHref="/"
        />
      }
      footer={
        <SideNavSection title="Account" isHeaderHidden>
          <UserProfileMenu />
        </SideNavSection>
      }
    >
      <SideNavSection title="Menu" isHeaderHidden>
        <ShellNavItem label="New chat" icon={PlusIcon} href="/" />
        <ShellNavItem
          label="Search"
          icon={MagnifyingGlassIcon}
          onClick={onOpenPalette}
        />
        <ShellNavItem label="Library" icon={BookOpenIcon} />
      </SideNavSection>
      <Divider />
      <SideNavSection title="Workspaces" isHeaderHidden>
        {WORKSPACES.map((workspace) => (
          <WorkspaceNavItem key={workspace.name} {...workspace} />
        ))}
      </SideNavSection>
    </SideNav>
  )
}

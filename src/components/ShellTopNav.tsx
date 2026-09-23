// Copyright (c) Meta Platforms, Inc. and affiliates.

'use client';

import {Fragment} from 'react';
import {TopNav} from '@astryxdesign/core/TopNav';
import {DropdownMenu, DropdownMenuItem} from '@astryxdesign/core/DropdownMenu';
import {Divider} from '@astryxdesign/core/Divider';
import {Kbd} from '@astryxdesign/core/Kbd';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Stack} from '@astryxdesign/core/Stack';
import {PlayIcon, MagnifyingGlassIcon} from '@heroicons/react/24/outline';

const noop = () => {};

type MenuEntry = [label: string, shortcut: string];

const MENU_WIDTH = 280;

const MENUS: {label: string; groups: MenuEntry[][]}[] = [
  {
    label: 'File',
    groups: [
      [
        ['New File', '⌘N'],
        ['New Window', '⇧⌘N'],
      ],
      [
        ['Open...', '⌘O'],
        ['Save', '⌘S'],
        ['Save As...', '⇧⌘S'],
      ],
      [['Close Editor', '⌘W']],
    ],
  },
  {
    label: 'Edit',
    groups: [
      [
        ['Undo', '⌘Z'],
        ['Redo', '⇧⌘Z'],
      ],
      [
        ['Cut', '⌘X'],
        ['Copy', '⌘C'],
        ['Paste', '⌘V'],
      ],
      [['Find', '⌘F']],
    ],
  },
  {
    label: 'View',
    groups: [
      [['Command Palette', '⇧⌘P']],
      [
        ['Explorer', '⇧⌘E'],
        ['Search', '⇧⌘F'],
      ],
      [
        ['Toggle Terminal', '⌃`'],
        ['Zen Mode', '⌘K'],
      ],
    ],
  },
  {
    label: 'Window',
    groups: [
      [
        ['Minimize', '⌘M'],
        ['Zoom', ''],
      ],
      [
        ['Next Tab', '⌃⇥'],
        ['Previous Tab', '⌃⇧⇥'],
      ],
      [['Bring All to Front', '']],
    ],
  },
  {
    label: 'Help',
    groups: [
      [
        ['Documentation', ''],
        ['Release Notes', ''],
        ['Report Issue', ''],
        ['About', ''],
      ],
    ],
  },
];

export function ShellTopNav({onOpenPalette}: {onOpenPalette: () => void}) {
  return (
    <TopNav
      label="Astryx Studio menu bar"
      startContent={
        <>
          {MENUS.map(menu => (
            <DropdownMenu
              key={menu.label}
              button={{label: menu.label, variant: 'ghost', size: 'sm'}}
              hasChevron={false}
              menuWidth={MENU_WIDTH}>
              {menu.groups.map((group, gi) => (
                <Fragment key={gi}>
                  {gi > 0 && <Divider />}
                  {group.map(([label, shortcut]) => (
                    <DropdownMenuItem
                      key={label}
                      label={label}
                      onClick={noop}
                      endContent={
                        shortcut ? <Kbd keys={shortcut} /> : undefined
                      }
                    />
                  ))}
                </Fragment>
              ))}
            </DropdownMenu>
          ))}
        </>
      }
      endContent={
        <>
          <Stack onClick={onOpenPalette}>
            <TextInput
              label="Search files and commands"
              isLabelHidden
              size="sm"
              width={240}
              startIcon={MagnifyingGlassIcon}
              placeholder="Search files and commands…"
              value=""
              onChange={() => {}}
            />
          </Stack>
          <IconButton
            label="Run project"
            tooltip="Run"
            variant="ghost"
            icon={<Icon icon={PlayIcon} size="sm" />}
          />
          <Button label="Share" variant="secondary" />
        </>
      }
    />
  );
}
// Copyright (c) Meta Platforms, Inc. and affiliates.

'use client';

import {createFileRoute} from '@tanstack/react-router';
import {ShellAppShell} from '../components/ShellAppShell';

export const Route = createFileRoute('/_layout')({
  component: ShellAppShell,
});
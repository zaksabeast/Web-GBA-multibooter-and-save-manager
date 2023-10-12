/*
 * Copyright (C) 2016 FIX94
 *
 * This software may be modified and distributed under the terms
 * of the MIT license.  See the LICENSE file for details.
 */
#include <gba.h>
#include <xcomms.h>
#include <stdio.h>
#include <stdlib.h>
#include "libSave.h"

#define REG_WAITCNT *(vu16 *)(REG_BASE + 0x204)
#define JOY_WRITE 2
#define JOY_READ 4
#define JOY_RW 6
#define MAX_SAVE_SIZE 0x20000
#define MAX_BUF_SIZE 0x64

u32 xcomms_recv();

u8 save_data[MAX_SAVE_SIZE] __attribute__((section(".sbss")));

void backup_save(u8 *out, u32 size)
{
	// disable interrupts
	u32 prevIrqMask = REG_IME;
	REG_IME = 0;
	// backup save
	switch (size)
	{
	case 0x200:
		GetSave_EEPROM_512B(out);
		break;
	case 0x2000:
		GetSave_EEPROM_8KB(out);
		break;
	case 0x8000:
		GetSave_SRAM_32KB(out);
		break;
	case 0x10000:
		GetSave_FLASH_64KB(out);
		break;
	case 0x20000:
		GetSave_FLASH_128KB(out);
		break;
	default:
		break;
	}
	// restore interrupts
	REG_IME = prevIrqMask;
}

void write_save(u8 *save, u32 size)
{
	u32 prevIrqMask = REG_IME;
	REG_IME = 0;
	// write it
	switch (size)
	{
	case 0x200:
		PutSave_EEPROM_512B(save);
		break;
	case 0x2000:
		PutSave_EEPROM_8KB(save);
		break;
	case 0x8000:
		PutSave_SRAM_32KB(save);
		break;
	case 0x10000:
		PutSave_FLASH_64KB(save);
		break;
	case 0x20000:
		PutSave_FLASH_128KB(save);
		break;
	default:
		break;
	}
	// restore interrupts
	REG_IME = prevIrqMask;
}

s32 getGameSize(void)
{
	if (*(vu32 *)(0x08000004) != 0x51AEFF24)
		return -1;
	s32 i;
	for (i = (1 << 20); i < (1 << 25); i <<= 1)
	{
		vu16 *rompos = (vu16 *)(0x08000000 + i);
		int j;
		bool romend = true;
		for (j = 0; j < 0x1000; j++)
		{
			if (rompos[j] != j)
			{
				romend = false;
				break;
			}
		}
		if (romend)
			break;
	}
	return i;
}

enum Command
{
	COMMAND_HEALTH_CHECK = 0,
	COMMAND_GET_GAME_SIZE = 1,
	COMMAND_GET_SAVE_SIZE = 2,
	COMMAND_READ_DATA = 3,
	COMMAND_WRITE_SAVE = 4,
	COMMAND_ECHO = 5,
};

//---------------------------------------------------------------------------------
// Program entry point
//---------------------------------------------------------------------------------
int main(void)
{
	//---------------------------------------------------------------------------------

	// the vblank interrupt must be enabled for VBlankIntrWait() to work
	// since the default dispatcher handles the bios flags no vblank handler
	// is required
	irqInit();
	irqEnable(IRQ_VBLANK);

	consoleDemoInit();
	REG_JOYTR = 0;
	xcomms_init();
	// ansi escape sequence to set print co-ordinates
	// /x1b[line;columnH
	iprintf("\x1b[9;2HGBA Link Cable Dumper v1.6\n");
	iprintf("\x1b[10;4HPlease look at the TV\n");
	// disable this, needs power
	SNDSTAT = 0;
	SNDBIAS = 0;
	// Set up waitstates for EEPROM access etc.
	REG_WAITCNT = 0x0317;
	// clear out previous messages
	REG_HS_CTRL |= JOY_RW;

	s32 game_size = -1;
	while (game_size == -1)
	{
		game_size = getGameSize();
	}
	// For some reason the first time can be incorrect sometimes?
	game_size = getGameSize();

	u32 save_size = SaveSize(save_data, game_size);
	iprintf("\x1b[11;4HGetting save data\n");
	backup_save(save_data, save_size);
	iprintf("\x1b[11;4HGame: %lx, save: %lx\n", game_size, save_size);

	u32 buf[MAX_BUF_SIZE] = {0};

	while (true)
	{
		u32 command = xcomms_recv();
		if (command == COMMAND_HEALTH_CHECK)
		{
			xcomms_send(0xc0de);
			continue;
		}

		u32 size = xcomms_recv();
		u32 max_size = command == COMMAND_WRITE_SAVE ? MAX_SAVE_SIZE : MAX_BUF_SIZE;
		size = size >= max_size ? max_size : size;
		u32 *cmd_buf = command == COMMAND_WRITE_SAVE ? (u32 *)save_data : buf;

		for (u32 i = 0; i < size; i++)
		{
			cmd_buf[i] = xcomms_recv();
		}

		switch (command)
		{
		case COMMAND_GET_GAME_SIZE:
			xcomms_send(game_size);
			break;
		case COMMAND_GET_SAVE_SIZE:
			xcomms_send(save_size);
			break;
		case COMMAND_READ_DATA:
			u32 *addr = (u32 *)cmd_buf[0];
			if (addr == (u32 *)0x7000000)
			{
				addr = (u32 *)save_data;
			}
			for (u32 i = 0; i < cmd_buf[1]; i++)
			{
				xcomms_send(addr[i]);
			}
			break;
		case COMMAND_WRITE_SAVE:
			if ((size * 4) == save_size)
			{
				write_save((u8 *)cmd_buf, save_size);
			}
			break;
		case COMMAND_ECHO:
			for (u32 i = 0; i < size; i++)
			{
				xcomms_send(cmd_buf[i]);
			}
			break;
		default:
			xcomms_send(0xbad);
			break;
		}
	}
}

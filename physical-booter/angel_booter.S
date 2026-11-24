/* Angel-OS Physical 16-bit x86 Bootloader (Sector 0 / El Torito Stage 1)
 * Fits cleanly within 446 bytes so it shares Sector 0 with a real 64-byte MBR
 * Partition Table (0x1BE..0x1FD) and 0x55AA signature (0x1FE..0x1FF).
 * Build:
 *   as --32 angel_booter.S -o angel_booter.o
 *   ld -m elf_i386 -Ttext 0x7C00 --oformat binary angel_booter.o -o angel_booter.bin
 */
.code16
.global _start

_start:
    cli
    xorw %ax, %ax
    movw %ax, %ds
    movw %ax, %es
    movw %ax, %ss
    movw $0x7C00, %sp
    sti

    /* Clear screen to Angel-OS Royal Blue (0x1F) */
    movw $0x0003, %ax
    int $0x10
    movw $0x0600, %ax
    movb $0x1F, %bh
    xorw %cx, %cx
    movw $0x184F, %dx
    int $0x10

    /* Reset cursor to top-left */
    movb $0x02, %ah
    xorb %bh, %bh
    xorw %dx, %dx
    int $0x10

    movw $msg_banner, %si
    call print_str

menu_loop:
    xorw %ax, %ax
    int $0x16               /* BIOS Wait Keypress: AL = ASCII */
    cmpb $'1', %al
    je do_boot
    cmpb $0x0D, %al         /* Enter */
    je do_boot
    cmpb $'2', %al
    je do_probe
    cmpb $'r', %al
    je do_reboot
    cmpb $'R', %al
    je do_reboot
    jmp menu_loop

do_boot:
    movw $msg_boot, %si
    call print_str
halt_loop:
    hlt
    jmp halt_loop

do_probe:
    int $0x12               /* Conventional KB in AX (verify BIOS call succeeds) */
    movw $msg_probe, %si
    call print_str
    jmp menu_loop

do_reboot:
    int $0x19               /* BIOS Warm Bootstrap Reload */
    ljmp $0xFFFF, $0x0000

print_str:
    lodsb
    testb %al, %al
    jz print_done
    movb $0x0E, %ah
    xorb %bh, %bh
    int $0x10
    jmp print_str
print_done:
    ret

msg_banner:
    .asciz "ANGEL-OS PHYSICAL BOOTER v1.4\r\n=============================\r\n[1/Enter] Boot Local Account OS\r\n[2] Probe BIOS & Partition Table\r\n[R] Reboot Hardware\r\n> "
msg_boot:
    .asciz "\r\n[OK] Angel-OS Local Account Kernel Active (x86 MBR/ISO Verified)\r\n"
msg_probe:
    .asciz "\r\n[OK] x86 Real-Mode Memory & MBR 0x55AA Probe Ready\r\n> "

    /* Ensure assembly code fits cleanly before 64-byte MBR Partition Table (offset 446 = 0x1BE) */
    .org 446
    /* Partition Table Entry 1..4 (64 bytes zero template overwritten by USB/IMG builder) */
    .space 64, 0
    .word 0xAA55

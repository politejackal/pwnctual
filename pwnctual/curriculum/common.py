"""Shared helpers for challenge generators."""
import string

WORDS = """
access admin alpha anchor archive backdoor binary bitstream buffer cache cipher
cobalt codex compile console cookie cortex crypt cursor daemon decoy delta
digest dragon echo enigma entropy exploit falcon fiber firewall flux forge
fragment frost gadget ghost glitch gopher hammer harbor hash header hollow
honey hydra index inject iron jackal kernel keystone lambda lantern ledger
lexicon linker lotus macro malware matrix memory meteor mirror module monolith
nebula neon nexus nimbus node nova obsidian onyx oracle orbit packet panther
parser patch payload phantom pixel pointer portal prism probe proxy pulse
quartz quasar radar raven reaper relay rogue router ruby runtime sandbox
scalpel scanner script sector sentinel shadow shell signal silicon skull socket
specter spider stack static stealth stream syntax tangent thread token torch
tracer trojan tunnel umbra vector venom vertex viper void vortex warden whisper
wraith xenon zenith zero
""".split()

NAMES = """
ada alan barbara claude dennis edsger frances grace hedy ida jean ken
linus margaret niklaus radia richard robert shafi tim whitfield yukihiro
""".split()

HEX = "0123456789abcdef"


def words(r, n):
    return " ".join(r.choice(WORDS) for _ in range(n))


def secret(r, n=16):
    return "pwn{" + "".join(r.choice(HEX) for _ in range(n)) + "}"


def noise(r, n):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+[];:,.<>/? "
    return "".join(r.choice(alphabet) for _ in range(n))


def ip(r):
    return ".".join(str(r.randint(1, 254)) for _ in range(4))


def port(r):
    return r.randint(20000, 60000)


def lines(*items):
    return "\n".join(str(x) for x in items) + "\n"

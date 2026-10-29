# Setting up the runner on an Oracle Ampere VM

The runner is a small Node service. For each submission it starts a fresh container per test
(arm64 image with gcc and python3), with no network, a read-only filesystem except `/tmp`,
2 s of CPU, 256 MB of memory and 64 KB of output. The hidden tests live only on this VM.

The Worker reaches it over HTTPS through a Cloudflare Tunnel, so the VM needs no open ports
apart from SSH.

## 1. Create the VM

In Oracle Cloud: **Compute → Instances → Create instance**.

- Image: Ubuntu 24.04 (aarch64)
- Shape: VM.Standard.A1.Flex. 2 OCPU and 12 GB is plenty; the free tier allows up to 4 OCPU and 24 GB in total.
- Add your SSH public key.

## 2. Install Docker, Node and git

```bash
sudo apt-get update
sudo apt-get install -y docker.io nodejs git
sudo systemctl enable --now docker
node --version   # needs 18 or newer
```

## 3. Create the service user and get the code

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin pwnctual
sudo usermod -aG docker pwnctual
sudo git clone https://github.com/politejackal/pwnctual.git /srv/pwnctual
sudo mkdir -p /srv/pwnctual-levels
```

Membership of the `docker` group is as powerful as root. That's acceptable on a VM that does
nothing else, but don't run other services on it.

## 4. Copy the levels, including the hidden tests

The tests and solutions aren't in the GitHub repo. Copy them from your computer:

```bash
# on your computer
scp -r levels/* ubuntu@<vm-ip>:/tmp/levels/
# on the VM
sudo cp -r /tmp/levels/* /srv/pwnctual-levels/ && rm -rf /tmp/levels
sudo chown -R root:pwnctual /srv/pwnctual-levels
sudo chmod -R u=rwX,g=rX,o= /srv/pwnctual-levels
```

## 5. Build the sandbox image

```bash
sudo docker build -t pwnctual-sandbox /srv/pwnctual/runner/sandbox
```

## 6. Set the API key and start the service

```bash
echo "RUNNER_KEY=$(openssl rand -hex 32)" | sudo tee /etc/pwnctual-runner.env
sudo chmod 600 /etc/pwnctual-runner.env
sudo cp /srv/pwnctual/runner/deploy/pwnctual-runner.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pwnctual-runner
curl -s http://127.0.0.1:8080/health
```

Keep the key. The Worker needs it in step 8.

Check that every level behaves as expected:

```bash
cd /srv/pwnctual
sudo -u pwnctual env RUNNER_KEY=<key> node scripts/validate-levels.mjs
```

This reads the levels from `/srv/pwnctual/levels`, which has no tests or solutions. Run it
from a copy that has them, or point it at the runner from your computer once the tunnel is up.

## 7. Put it behind HTTPS with a Cloudflare Tunnel

```bash
curl -L -o cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb
cloudflared tunnel login                  # opens a link; pick pwnctual.com
cloudflared tunnel create pwnctual-runner
cloudflared tunnel route dns pwnctual-runner runner.pwnctual.com
```

Create `/etc/cloudflared/config.yml` (the tunnel id and credentials file come from `tunnel create`):

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/<tunnel-id>.json
ingress:
  - hostname: runner.pwnctual.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

```bash
sudo cp ~/.cloudflared/<tunnel-id>.json /etc/cloudflared/
sudo cloudflared service install
curl -s https://runner.pwnctual.com/health
```

## 8. Point the Worker at it

On your computer:

```bash
npx wrangler secret put RUNNER_KEY --config api/wrangler.jsonc   # paste the key
```

Set `"RUNNER_URL": "https://runner.pwnctual.com"` in `api/wrangler.jsonc`, then
`npm run deploy:api`.

## Updating

```bash
cd /srv/pwnctual && sudo git pull
sudo docker build -t pwnctual-sandbox runner/sandbox   # only if the Dockerfile changed
sudo systemctl restart pwnctual-runner
```

New or changed levels: copy their folders to `/srv/pwnctual-levels` again (step 4). No restart needed.

## If AddressSanitizer fails to start

If C submissions fail with `Shadow memory range interleaves with an existing memory mapping`
or `ASan runtime does not come first`, lower the address randomisation bits on the VM:

```bash
echo 'vm.mmap_rnd_bits = 28' | sudo tee /etc/sysctl.d/90-asan.conf
sudo sysctl --system
```

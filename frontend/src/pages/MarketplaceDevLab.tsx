import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from '../lib/swal';
import {
  acceptOffer,
  createLoadOfferRequest,
  fetchLoadOffers,
  fetchOfferMessages,
  fetchTrip,
  type LoadOffer,
  type OfferMessage,
  postOfferMessage,
  withdrawOffer,
} from "../api/marketplace";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";

type OfferAction = "withdraw" | "accept" | "refresh-messages";

interface OfferFormState {
  amount: string;
  currency: string;
  message: string;
  expires_at: string;
}

const emptyForm: OfferFormState = {
  amount: "",
  currency: "USD",
  message: "",
  expires_at: "",
};

function formatCurrency(amount: string, currency: string) {
  const parsed = Number(amount);
  if (Number.isNaN(parsed)) {
    return `${amount} ${currency}`;
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function MarketplaceDevLab() {
  const [loadId, setLoadId] = useState("");
  const [offers, setOffers] = useState<LoadOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [form, setForm] = useState<OfferFormState>(emptyForm);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OfferMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [messagePending, setMessagePending] = useState(false);
  const [tripLookupId, setTripLookupId] = useState("");
  const [tripSummary, setTripSummary] = useState<Awaited<ReturnType<typeof fetchTrip>> | null>(null);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const tripRecord = tripSummary?.trip ?? null;
  const loadRecord = tripSummary?.load ?? null;
  const paymentRecord = tripSummary?.payment ?? null;

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.id === selectedOfferId) ?? null,
    [offers, selectedOfferId]
  );

  useEffect(() => {
    if (!selectedOffer) {
      setMessages([]);
      return;
    }
    const controller = new AbortController();
    fetchOfferMessages(selectedOffer.id)
      .then((response) => {
        if (!controller.signal.aborted) {
          setMessages(response.items);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error(error);
          toast.error("Failed to load messages.");
        }
      });
    return () => controller.abort();
  }, [selectedOffer?.id]);

  async function handleRefreshOffers() {
    if (!loadId) {
      toast.error("Provide a load ID first.");
      return;
    }
    try {
      setIsLoadingOffers(true);
      const response = await fetchLoadOffers(loadId);
      setOffers(response.items);
      toast.success(`Fetched ${response.items.length} offers.`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load offers.");
    } finally {
      setIsLoadingOffers(false);
    }
  }

  async function handleCreateOffer(event: FormEvent) {
    event.preventDefault();
    if (!loadId) {
      toast.error("Provide a load ID before creating an offer.");
      return;
    }
    const offeredAmount = Number(form.amount);
    if (!Number.isFinite(offeredAmount) || offeredAmount <= 0) {
      toast.error("Enter a positive offer amount.");
      return;
    }
    try {
      const { offer } = await createLoadOfferRequest(loadId, {
        offered_amount: offeredAmount,
        currency: form.currency || "USD",
        message: form.message || undefined,
        expires_at: form.expires_at || undefined,
      });
      setOffers((current) => [offer, ...current]);
      setForm(emptyForm);
      toast.success("Offer created.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create offer.");
    }
  }

  async function handleOfferAction(offer: LoadOffer, action: OfferAction) {
    try {
      if (action === "withdraw") {
        const { offer: updated } = await withdrawOffer(offer.id);
        setOffers((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
        toast.success("Offer withdrawn.");
      } else if (action === "accept") {
        const response = await acceptOffer(offer.id);
        setOffers((current) =>
          current.map((item) => (item.id === response.offer.id ? response.offer : item))
        );
        toast.success("Offer accepted. Trip created.");
        setTripLookupId(response.trip.id);
        await loadTrip(response.trip.id);
      } else if (action === "refresh-messages") {
        const response = await fetchOfferMessages(offer.id);
        setMessages(response.items);
        toast.success("Conversation refreshed.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Offer action failed.");
    }
  }

  async function handleSendMessage() {
    if (!selectedOffer) return;
    if (!messageDraft.trim()) {
      toast.error("Write a message before sending.");
      return;
    }
    try {
      setMessagePending(true);
      const { message } = await postOfferMessage(selectedOffer.id, {
        text: messageDraft.trim(),
      });
      setMessages((current) => [...current, message]);
      setMessageDraft("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message.");
    } finally {
      setMessagePending(false);
    }
  }

  async function loadTrip(tripId: string) {
    if (!tripId) return;
    try {
      setIsLoadingTrip(true);
      const summary = await fetchTrip(tripId);
      setTripSummary(summary);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load trip.");
    } finally {
      setIsLoadingTrip(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Internal tools
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Marketplace integration lab
        </h1>
        <p className="text-muted-foreground">
          Quick playground for the new bidding + chat + escrow APIs. Use this to
          send manual requests without wiring up the production UI yet.
        </p>
      </header>

      <Card>
        <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>1. Load offers</CardTitle>
            <CardDescription>
              Inspect an existing load, post new offers, and accept/withdraw them.
            </CardDescription>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input
              placeholder="Load ID"
              value={loadId}
              onChange={(event) => setLoadId(event.target.value)}
            />
            <Button onClick={handleRefreshOffers} disabled={isLoadingOffers || !loadId}>
              {isLoadingOffers ? "Loading..." : "Fetch offers"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={handleCreateOffer}
            className="grid gap-4 rounded-lg border p-4 sm:grid-cols-4"
          >
            <Input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((state) => ({ ...state, amount: event.target.value }))}
              placeholder="Offered amount"
            />
            <Input
              value={form.currency}
              onChange={(event) => setForm((state) => ({ ...state, currency: event.target.value }))}
              placeholder="Currency"
              maxLength={3}
            />
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(event) => setForm((state) => ({ ...state, expires_at: event.target.value }))}
              placeholder="Expires at"
            />
            <Button type="submit" disabled={!loadId}>
              Create offer
            </Button>
            <Textarea
              className="sm:col-span-4"
              placeholder="Optional message to attach"
              value={form.message}
              onChange={(event) => setForm((state) => ({ ...state, message: event.target.value }))}
            />
          </form>

          <div className="grid gap-4 lg:grid-cols-2">
            <ScrollArea className="h-[28rem] rounded-lg border">
              {offers.length === 0 ? (
                <div className="flex h-[28rem] items-center justify-center text-sm text-muted-foreground">
                  No offers yet — fetch or create one.
                </div>
              ) : (
                <ul className="divide-y">
                  {offers.map((offer) => (
                    <li
                      key={offer.id}
                      className="flex flex-col gap-3 p-4 hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {formatCurrency(offer.offered_amount, offer.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Offer #{offer.id} · Hauler #{offer.hauler_id}
                          </p>
                        </div>
                        <Badge>{offer.status}</Badge>
                      </div>
                      {offer.message ? (
                        <p className="text-sm text-muted-foreground">{offer.message}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedOfferId(offer.id);
                            handleOfferAction(offer, "refresh-messages");
                          }}
                        >
                          Inspect chat
                        </Button>
                        {offer.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOfferAction(offer, "withdraw")}
                            >
                              Withdraw
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleOfferAction(offer, "accept")}
                            >
                              Accept → create trip
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>

            <div className="flex h-[28rem] flex-col rounded-lg border">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <div>
                  <p className="font-medium">Offer chat</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedOffer
                      ? `Offer #${selectedOffer.id} (${selectedOffer.status})`
                      : "Select an offer to view conversation"}
                  </p>
                </div>
                {selectedOffer ? (
                  <Badge variant="secondary">{selectedOffer.status}</Badge>
                ) : null}
              </div>
              <ScrollArea className="flex-1">
                {selectedOffer ? (
                  <div className="space-y-4 p-4 text-sm">
                    {messages.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        No messages yet.
                      </p>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{message.sender_role}</span>
                            <span>{new Date(message.created_at).toLocaleString()}</span>
                          </div>
                          {message.text ? <p className="mt-2">{message.text}</p> : null}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                    Pick an offer to open its chat thread.
                  </div>
                )}
              </ScrollArea>
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Input
                    value={messageDraft}
                    disabled={!selectedOffer}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    placeholder="Message text"
                  />
                  <Button
                    disabled={!selectedOffer || messagePending}
                    onClick={handleSendMessage}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>2. Trip + escrow snapshot</CardTitle>
            <CardDescription>
              Paste any trip ID created by the acceptance flow to inspect its latest status
              and payment metadata.
            </CardDescription>
          </div>
          <div className="flex w-full gap-2 md:w-auto">
            <Input
              placeholder="Trip ID"
              value={tripLookupId}
              onChange={(event) => setTripLookupId(event.target.value)}
            />
            <Button
              onClick={() => loadTrip(tripLookupId)}
              disabled={!tripLookupId || isLoadingTrip}
            >
              {isLoadingTrip ? "Fetching..." : "Load trip"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tripSummary ? (
            <div className="space-y-6 rounded-xl border p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Trip
                  </p>
                  <p className="text-lg font-semibold">{tripRecord ? tripRecord.id : "N/A"}</p>
                  <p className="text-sm text-muted-foreground">
                    Status: {tripRecord ? tripRecord.status : "Unavailable"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Load
                  </p>
                  <p className="text-lg font-semibold">{loadRecord ? loadRecord.id : "N/A"}</p>
                  <p className="text-sm text-muted-foreground">
                    State: {loadRecord ? loadRecord.status : "Unavailable"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Assignment
                  </p>
                    {tripRecord ? (
                      <>
                        <p className="text-sm">
                          Driver #{tripRecord.assigned_driver_id || "—"}
                        </p>
                        <p className="text-sm">
                          Vehicle #{tripRecord.assigned_vehicle_id || "—"}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Trip record unavailable</p>
                    )}
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Timing
                  </p>
                  <ul className="text-sm text-muted-foreground">
                    <li>Started: {tripRecord?.started_at ? new Date(tripRecord.started_at).toLocaleString() : "—"}</li>
                    <li>Delivered: {tripRecord?.delivered_at ? new Date(tripRecord.delivered_at).toLocaleString() : "—"}</li>
                    <li>Confirmed: {tripRecord?.delivered_confirmed_at ? new Date(tripRecord.delivered_confirmed_at).toLocaleString() : "—"}</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Payment
                  </p>
                  {paymentRecord ? (
                    <div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(paymentRecord.amount, paymentRecord.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status: {paymentRecord.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Auto release:{" "}
                        {paymentRecord.auto_release_at
                          ? new Date(paymentRecord.auto_release_at).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No escrow payment recorded.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground">
              Lookup a trip to display its current status.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MarketplaceDevLab;

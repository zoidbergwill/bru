import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { BehaviorSubject, Subscription } from 'rxjs';
import { debounceTime, map, switchMap } from 'rxjs/operators';

import { BesService } from '../../../services/bes.service';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';


@Component({
  selector: 'bes-invocation-log',
  templateUrl: './invocation-log.component.html',
  styleUrls: ['./invocation-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvocationLogComponent implements OnInit, OnDestroy {
  log$: BehaviorSubject<SafeHtml[]> = new BehaviorSubject<string[]>([]);

  @ViewChild(CdkVirtualScrollViewport, { static: true }) scrollViewport: CdkVirtualScrollViewport;

  fragment: number;
  loading = true;

  private subscriptions: Subscription[] = [];

  constructor(private readonly route: ActivatedRoute,
              private readonly router: Router,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly sanitizer: DomSanitizer,
              private readonly bes: BesService) {}

  ngOnInit(): void {
    const logChangeSubscription = this.route.parent.paramMap
      .pipe(
        map(values => values.get(BesService.INVOCATION_URL_PARAM)),
        switchMap(id => this.bes.registerForProgress(id)),
        map(data => this.sanitizer.bypassSecurityTrustHtml(data)),
        map(data => [...this.log$.getValue(), data])
      ).subscribe(this.log$);

    const scrollSubscription = this.log$
      .pipe(debounceTime(200))
      .subscribe(() => this.scrollToIndex(this.scrollViewport.getDataLength() - 1));

    const scrollFragmentSubscription = this.route.fragment
      .pipe(
        map(line => parseInt(line, 10)),
        map(line => line - 1)
      )
      .subscribe(line => {
        if (!!this.fragment) {
          setTimeout(() => this.scrollToIndex(line), 500);
        } else {
          this.scrollToIndex(line);
        }

      });

    this.subscriptions.push(logChangeSubscription, scrollSubscription, scrollFragmentSubscription);
  }

  ngOnDestroy(): void {
    if (this.subscriptions.length) {
      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions = [];
    }

    this.log$.complete();
  }

  private scrollToIndex(index: number) {
    this.scrollViewport.scrollToIndex(index, 'smooth');
    this.fragment = index;
  }

}
